# Kastyum Marketplace Backend

## Overview
Kastyum is a suit (kastyum) marketplace platform where sellers can list their products and buyers can browse, filter, and place orders. The backend is a fully REST API-based service built with NestJS monorepo architecture and MongoDB.

## Tech Stack
| Layer         | Technology                          |
|---------------|-------------------------------------|
| Runtime       | Node.js                            |
| Framework     | NestJS 11 (Monorepo)               |
| Database      | MongoDB + Mongoose 9               |
| Auth          | JWT (`@nestjs/jwt`) + bcryptjs     |
| Validation    | class-validator + class-transformer|
| Language      | TypeScript 5                       |

## Project Structure
```
apps/
  api/
    src/
      main.ts                          # Entry point (global pipes, filters, interceptors, CORS)
      api.module.ts                    # Root module (Config, Mongoose, ComponentsModule)
      api.controller.ts                # Health check controller
      api.service.ts                   # Root service
      components/
        components.module.ts           # Aggregates all feature modules
        auth/                          # JWT token generation (no controller)
          auth.module.ts               # Global module, exports AuthService + JwtModule
          auth.service.ts              # generateToken()
        member/                        # User management + authentication
          schemas/member.schema.ts     # Member model (nick, email, password, phone, type, status)
          dto/member.input.ts          # MemberInput, LoginInput DTOs
          dto/login.dto.ts             # Login DTO
          member.module.ts
          member.service.ts            # signup(), login(), getMemberMe(), updateMember(), getMemberDetail(), etc.
          member.controller.ts         # User facing: signup, login, me, update, detail
          member.admin.controller.ts   # Admin facing: list, detail, update
        attributes/                    # Dynamic catalog attributes
          schemas/attributes.schema.ts # Color, Size, Brand, Material, Fit models
          dto/attribute.dto.ts
          attributes.module.ts
          attributes.service.ts        # CRUD for all attribute types
          attributes.controller.ts     # GET /attribute/list/:type, POST /attribute/create/:type
        products/                      # Product (suit) management
          schemas/product.schema.ts    # Product model with attribute refs
          dto/create-product.dto.ts
          products.module.ts
          products.service.ts          # CRUD + filtering
          products.controller.ts       # POST /product/create, GET /product/list, etc.
        orders/                        # Order management
          schemas/order.schema.ts      # Order + OrderItem models
          dto/create-order.dto.ts
          dto/update-order-status.dto.ts
          orders.module.ts
          orders.service.ts
          orders.controller.ts         # POST /order/create, GET /order/my-list, etc.
      libs/
        decorators/
          current-user.decorator.ts    # @CurrentUser() extracts user from JWT
          roles.decorator.ts           # @Roles() sets required MemberType
        enums/
          common.enum.ts               # Message enum (all error messages in English)
        filters/
          http-exception.filter.ts     # Global exception handler
        guards/
          jwt-auth.guard.ts            # Validates JWT from Authorization header
          roles.guard.ts               # Checks user.type against required roles
        interceptor/
          Logging.interceptor.ts       # Logs all HTTP requests/responses
```

## Member Roles
| Role     | Description                                    |
|----------|------------------------------------------------|
| `ADMIN`  | Manages attributes, can delete any product     |
| `SELLER` | Creates/updates/deletes own products, manages order status |
| `USER`   | Browses products, places orders                |

## Authentication
- Email + password based signup/login
- JWT token returned on successful auth
- All protected routes require `Authorization: Bearer <TOKEN>` header
- Password hashing via bcryptjs
- **Security**: Member password is set to `select: false` in schema and stripped from all auth responses.
- **Uniqueness**: 
  - `email` (String, Unique)
  - `phone` (String, Unique)
  - `image` (String, Optional)
  - `type` (Enum: ADMIN, SELLER, USER)

## Database Collections
| Collection  | Schema         | Key Fields                                                |
|-------------|----------------|-----------------------------------------------------------|
| members     | Member         | nick, email, password, phone, image, type, status         |
| products    | Product        | sellerId (ref: Member), title, description, price, colors, sizes, brand, material, fit, images, stockCount, inStock, status |
| orders      | Order          | memberId (ref: Member), sellerId (ref: Member), items (embedded OrderItem[]), totalAmount, status, shippingAddress |
| colors      | Color          | name, hexCode                                             |
| sizes       | Size           | name                                                      |
| brands      | Brand          | name                                                      |
| materials   | Material       | name                                                      |
| fits        | Fit            | name                                                      |

## API Endpoints
All endpoints use only `GET` (read) and `POST` (write) methods.
> **Note:** Barcha ADMIN roliga tegishli bo'lgan API endpoint'lar muqarrar ravishda `/admin/...` bilan boshlanishi shart.

### Member
| Method | Endpoint                    | Auth | Role  | Description               |
|--------|-----------------------------|------|-------|---------------------------|
| POST   | /member/signup              | No   | -     | Register (Unique nick/email/phone) |
| POST   | /member/login               | No   | -     | Login                     |
| GET    | /member/me                  | Yes  | -     | Get current user profile  |
| POST   | /member/update              | Yes  | -     | Update own profile        |
| GET    | /member/detail/:id          | No   | -     | Get member public info    |

### Member Admin
| Method | Endpoint                    | Auth | Role  | Description               |
|--------|-----------------------------|------|-------|---------------------------|
| GET    | /admin/member/list          | Yes  | ADMIN | List all members          |
| GET    | /admin/member/detail/:id    | Yes  | ADMIN | Get any member detail     |
| POST   | /admin/member/update/:id    | Yes  | ADMIN | Update member status/type |

### Attributes
| Method | Endpoint                          | Auth | Role  | Description       |
|--------|-----------------------------------|------|-------|-------------------|
| GET    | /attribute/list/:type             | No   | -     | List by type      |
| POST   | /admin/attribute/create/:type     | Yes  | ADMIN | Create attribute  |
| POST   | /admin/attribute/delete/:type/:id | Yes  | ADMIN | Delete attribute  |

### Products
| Method | Endpoint            | Auth | Role   | Description          |
|--------|---------------------|------|--------|----------------------|
| POST   | /product/create     | Yes  | SELLER | Create product       |
| GET    | /product/list       | No   | -      | List with filters    |
| GET    | /product/detail/:id | No   | -      | Get single product   |
| POST   | /product/update/:id | Yes  | SELLER | Update own product   |
| POST   | /product/delete/:id | Yes  | SELLER/ADMIN | Delete product |

### Orders
| Method | Endpoint                  | Auth | Role   | Description             |
|--------|---------------------------|------|--------|-------------------------|
| POST   | /order/create             | Yes  | USER   | Place order              |
| GET    | /order/my-list            | Yes  | USER   | Get my orders            |
| GET    | /order/seller-list        | Yes  | SELLER | Get orders for seller    |
| POST   | /order/update-status/:id  | Yes  | SELLER | Update order status      |

### Order Statuses
`PENDING` → `ACCEPTED` → `SHIPPED` (or `CANCELLED`)

### Product Filters (query params on /product/list)
`brand`, `material`, `fit`, `color`, `size`, `minPrice`, `maxPrice`

## Global Middleware
- **ValidationPipe**: whitelist enabled, strips unknown properties
- **HttpExceptionFilter**: formats all errors as `{ code, message }`
- **LoggingInterceptor**: logs request method, URL, body, query, params, response time
- **CORS**: enabled with credentials

## Error Messages
All error messages are centralized in `libs/enums/common.enum.ts` as `Message` enum (English only).

## Environment Variables
| Variable     | Description              |
|-------------|--------------------------|
| PORT        | API server port          |
| MONGODB_URI | MongoDB connection string|
| JWT_SECRET  | JWT signing secret       |

## Development
```bash
npm install          # Install dependencies
npm run start:dev    # Start dev server with hot reload
npm run build        # Build for production
```
