import { Body, Controller, Get, Param, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';
import { PaymentsService } from './payments.service';
import { PreparePaymentDto } from './dto/prepare-payment.dto';
import { JwtAuthGuard } from '../../libs/guards/jwt-auth.guard';
import { RolesGuard } from '../../libs/guards/roles.guard';
import { Roles } from '../../libs/decorators/roles.decorator';
import { CurrentUser } from '../../libs/decorators/current-user.decorator';
import { MemberType } from '../member/schemas/member.schema';

// Known OCTO payment gateway IP ranges (https://octo.uz).
// Set OCTO_NOTIFY_IPS in .env to override/extend, comma-separated.
const DEFAULT_OCTO_IPS = ['195.158.8.0/24', '195.158.9.0/24'];

function ipInCidr(ip: string, cidr: string): boolean {
    const [range, bits] = cidr.split('/');
    const mask = ~(2 ** (32 - Number(bits)) - 1);
    const toInt = (s: string) => s.split('.').reduce((acc, b) => (acc << 8) + Number(b), 0);
    return (toInt(ip) & mask) === (toInt(range) & mask);
}

@Controller('payments/octo')
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) { }

    @Post('prepare')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(MemberType.USER)
    prepare(@Body() dto: PreparePaymentDto, @CurrentUser() user: any) {
        return this.paymentsService.preparePayment(user.sub, user.email, dto.orderId, dto.phone);
    }

    @Get('status/:orderId')
    @UseGuards(JwtAuthGuard)
    status(@Param('orderId') orderId: string, @CurrentUser() user: any) {
        return this.paymentsService.getStatus(user.sub, orderId);
    }

    // Webhook called by OCTO — not a user-facing endpoint, skip rate limiter.
    // Validated by re-querying OCTO inside the service, but we also restrict
    // to OCTO's own IP ranges to reduce the attack surface.
    @SkipThrottle()
    @Post('notify')
    notify(@Body() body: any, @Req() req: Request) {
        const raw = (process.env.OCTO_NOTIFY_IPS || DEFAULT_OCTO_IPS.join(',')).split(',').map((s) => s.trim()).filter(Boolean);
        const clientIp: string = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '';

        // In development (no env override) the list is the real OCTO CIDRs, so
        // localhost calls will pass through — disable this guard by setting
        // OCTO_NOTIFY_IPS=0.0.0.0/0 if you need to test locally.
        const allowed = raw.some((entry) =>
            entry.includes('/') ? ipInCidr(clientIp, entry) : clientIp === entry,
        );

        if (!allowed && process.env.NODE_ENV === 'production') {
            throw new UnauthorizedException('OCTO notify: untrusted source IP.');
        }

        return this.paymentsService.handleNotify(body);
    }
}
