# Code Quality & Best Practices Skill

Definisce standard di qualità, performance e best practices per il codebase.

---

## Purpose

Garantire:
- **Code maintainability** - Codice leggibile, testabile, debuggabile
- **Performance** - Bundle ottimizzati, query efficienti, no memory leaks
- **Type safety** - TypeScript usato correttamente, no escape hatches
- **Testing** - Coverage adeguata, test patterns corretti
- **Framework best practices** - NestJS e Angular usati secondo linee guida ufficiali

---

## TypeScript Best Practices

### Type Safety

**MUST**:
- ✅ Evitare `any` - usare `unknown` o generic type
- ✅ Definire interface/type espliciti per tutte le API boundaries
- ✅ Usare strict mode: `"strict": true` in tsconfig.json
- ✅ Type guards per runtime type checking

**MUST NOT**:
- ❌ Type assertions (`as`) senza giustificazione (commento)
- ❌ `@ts-ignore` o `@ts-nocheck` (fix il type error invece)
- ❌ `any` in public API signatures
- ❌ Empty interfaces (`interface Foo {}`)

**Examples**:

```typescript
// ❌ BAD - any escape hatch
function processData(data: any) {
  return data.value;
}

// ✅ GOOD - explicit types
interface ResponseData {
  value: string;
  status: number;
}

function processData(data: ResponseData): string {
  return data.value;
}

// ❌ BAD - type assertion without reason
const user = response.data as User;

// ✅ GOOD - type guard with runtime check
function isUser(data: unknown): data is User {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'email' in data
  );
}

if (isUser(response.data)) {
  const user = response.data; // type is User
}
```

### Generics Usage

**MUST**:
- ✅ Usare generics per componenti/servizi riutilizzabili
- ✅ Vincolare generics quando appropriato (`<T extends BaseType>`)
- ✅ Default type parameters per convenience

**Examples**:

```typescript
// ❌ BAD - repetitive code
class UserRepository {
  findById(id: string): Promise<User> { ... }
}

class ProductRepository {
  findById(id: string): Promise<Product> { ... }
}

// ✅ GOOD - generic repository
class Repository<T extends { id: string }> {
  findById(id: string): Promise<T> { ... }
  findAll(): Promise<T[]> { ... }
}

const userRepo = new Repository<User>();
const productRepo = new Repository<Product>();
```

---

## NestJS Best Practices

### Dependency Injection

**MUST**:
- ✅ Sempre usare constructor injection
- ✅ Dichiarare providers in module corretto
- ✅ Usare `@Injectable()` su tutti i services
- ✅ Scope di default (`SINGLETON`) salvo necessità specifiche

**MUST NOT**:
- ❌ Creare istanze con `new` - usa DI container
- ❌ Circular dependencies non risolte
- ❌ Property injection (confusing, anti-pattern)

**Examples**:

```typescript
// ❌ BAD - manual instantiation
export class QuotationService {
  private userService = new UserService();
}

// ✅ GOOD - constructor injection
@Injectable()
export class QuotationService {
  constructor(
    private readonly userService: UserService,
    private readonly logger: Logger,
  ) {}
}
```

### DTOs & Validation

**MUST**:
- ✅ Definire DTO per ogni endpoint input
- ✅ Usare `class-validator` decorators
- ✅ `class-transformer` per type conversion
- ✅ ValidationPipe con `whitelist: true`, `forbidNonWhitelisted: true`

**Examples**:

```typescript
// ❌ BAD - no validation
@Post()
create(@Body() data: any) {
  return this.service.create(data);
}

// ✅ GOOD - strict DTO validation
export class CreateQuotationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  projectName: string;

  @IsEnum(ProjectType)
  projectType: ProjectType;

  @IsNumber()
  @Min(0)
  @Max(1000000)
  estimatedBudget: number;

  @IsDateString()
  @IsOptional()
  startDate?: string;
}

@Post()
create(@Body() dto: CreateQuotationDto) {
  return this.service.create(dto);
}
```

### Error Handling

**MUST**:
- ✅ Usare built-in exceptions (`NotFoundException`, `BadRequestException`)
- ✅ Custom exceptions extend `HttpException`
- ✅ Exception filters per error formatting consistente
- ✅ Log errors con context (user, request, stack)

**MUST NOT**:
- ❌ Throw generic `Error` - usa typed exceptions
- ❌ Swallow errors silently (`catch {}`)
- ❌ Return error details in production (info leak)

**Examples**:

```typescript
// ❌ BAD - generic error
if (!user) {
  throw new Error('User not found');
}

// ✅ GOOD - typed exception
if (!user) {
  throw new NotFoundException(`User with ID ${id} not found`);
}

// ❌ BAD - swallowed error
try {
  await this.externalService.call();
} catch {}

// ✅ GOOD - logged and handled
try {
  await this.externalService.call();
} catch (error) {
  this.logger.error('External service call failed', error.stack);
  throw new ServiceUnavailableException('External service temporarily unavailable');
}
```

### Database Queries

**MUST**:
- ✅ Usare query builder o repository pattern
- ✅ Eager/lazy loading consapevole (evitare N+1)
- ✅ Indexes su colonne usate in WHERE/JOIN
- ✅ Pagination per liste (limit/offset o cursor-based)
- ✅ Transactions per operazioni multi-step

**MUST NOT**:
- ❌ N+1 queries (loop che fa query per ogni item)
- ❌ SELECT * - specificare solo colonne necessarie
- ❌ Missing indexes su foreign keys
- ❌ Large result sets senza pagination

**Examples**:

```typescript
// ❌ BAD - N+1 query problem
async getQuotationsWithUsers() {
  const quotations = await this.quotationRepo.find();
  for (const q of quotations) {
    q.user = await this.userRepo.findOne(q.userId); // N queries!
  }
  return quotations;
}

// ✅ GOOD - eager loading con relations
async getQuotationsWithUsers() {
  return this.quotationRepo.find({
    relations: ['user'], // Single JOIN query
  });
}

// ❌ BAD - no pagination
async getAllQuotations() {
  return this.quotationRepo.find(); // Può ritornare 100k rows!
}

// ✅ GOOD - paginated
async getAllQuotations(page: number, limit: number) {
  return this.quotationRepo.find({
    skip: (page - 1) * limit,
    take: limit,
  });
}
```

---

## Angular Best Practices

### Change Detection

**MUST**:
- ✅ Usare `OnPush` change detection per component dumb
- ✅ Immutability per input properties
- ✅ `async` pipe per Observables (auto unsubscribe)
- ✅ `trackBy` in `*ngFor` per liste grandi

**MUST NOT**:
- ❌ Mutare @Input() properties
- ❌ Manual subscription senza unsubscribe
- ❌ Heavy computation in template expressions
- ❌ `*ngFor` senza trackBy su liste >20 items

**Examples**:

```typescript
// ❌ BAD - default change detection, no trackBy
@Component({
  template: `
    <div *ngFor="let item of items">
      {{ expensiveComputation(item) }}
    </div>
  `
})
export class ListComponent {
  items = [];
  
  expensiveComputation(item: any) {
    // Called on EVERY change detection!
    return heavyCalculation(item);
  }
}

// ✅ GOOD - OnPush, trackBy, pre-computed
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div *ngFor="let item of items; trackBy: trackById">
      {{ item.preComputedValue }}
    </div>
  `
})
export class ListComponent {
  @Input() items: ReadonlyArray<Item> = [];
  
  trackById(index: number, item: Item): string {
    return item.id;
  }
}
```

### RxJS Patterns

**MUST**:
- ✅ Unsubscribe da Observables (async pipe, takeUntil, takeWhile)
- ✅ Error handling in streams (`catchError`, `retry`)
- ✅ Flattening operators appropriati (`switchMap`, `mergeMap`, `concatMap`)
- ✅ Share streams con `shareReplay` quando appropriato

**MUST NOT**:
- ❌ Nested subscriptions (callback hell RxJS style)
- ❌ Subscribe in subscribe
- ❌ Ignorare errors in streams
- ❌ Memory leaks da subscriptions non chiuse

**Examples**:

```typescript
// ❌ BAD - nested subscriptions, no cleanup
ngOnInit() {
  this.userService.getUser().subscribe(user => {
    this.quotationService.getQuotations(user.id).subscribe(quotations => {
      this.quotations = quotations; // Memory leak + callback hell
    });
  });
}

// ✅ GOOD - flattening operators, async pipe
quotations$ = this.userService.getUser().pipe(
  switchMap(user => this.quotationService.getQuotations(user.id)),
  catchError(error => {
    this.logger.error('Failed to load quotations', error);
    return of([]);
  }),
  shareReplay(1)
);

// Template: <div *ngFor="let q of quotations$ | async">
```

### Bundle Optimization

**MUST**:
- ✅ Lazy loading per feature modules
- ✅ Tree-shakeable providers (`providedIn: 'root'`)
- ✅ Dynamic imports per componenti pesanti
- ✅ AOT compilation in production
- ✅ Prod build con `--configuration production`

**MUST NOT**:
- ❌ Import di librerie intere (`import * as _ from 'lodash'`)
- ❌ Tutto in AppModule (no lazy loading)
- ❌ Large dependencies per feature minori

**Examples**:

```typescript
// ❌ BAD - imports entire library (300kb)
import * as _ from 'lodash';
const result = _.debounce(fn, 300);

// ✅ GOOD - imports only needed function (5kb)
import debounce from 'lodash-es/debounce';
const result = debounce(fn, 300);

// ❌ BAD - all modules eager loaded
@NgModule({
  imports: [
    AdminModule,
    ReportsModule,
    AnalyticsModule, // User might never visit these!
  ]
})

// ✅ GOOD - lazy loaded routes
const routes: Routes = [
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule)
  },
  {
    path: 'reports',
    loadChildren: () => import('./reports/reports.module').then(m => m.ReportsModule)
  }
];
```

---

## Testing Requirements

### Coverage Thresholds

**MUST**:
- ✅ Minimum 80% line coverage per services
- ✅ Minimum 70% branch coverage
- ✅ 100% coverage per:
  - Business logic critiche (cost calculation, state machine)
  - Security logic (authentication, authorization)
  - Data transformation (mappers, validators)

**Examples**:

```javascript
// jest.config.js
module.exports = {
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/services/': {
      branches: 90,
      functions: 95,
      lines: 95
    }
  }
};
```

### Test Patterns

**MUST**:
- ✅ AAA pattern (Arrange, Act, Assert)
- ✅ Un solo assertion concept per test
- ✅ Mock external dependencies
- ✅ Descriptive test names (`should return null when user not found`)

**MUST NOT**:
- ❌ Test che dipendono da ordine esecuzione
- ❌ Test che chiamano API reali
- ❌ Test con sleep/timeout (flaky)
- ❌ Test con assertion generiche (`expect(result).toBeTruthy()`)

**Examples**:

```typescript
// ❌ BAD - unclear test, multiple concepts
it('test user', () => {
  const user = service.getUser();
  expect(user).toBeTruthy();
  expect(user.name).toBe('John');
});

// ✅ GOOD - clear, single concept per test
describe('UserService', () => {
  describe('getUser', () => {
    it('should return user when ID exists', () => {
      // Arrange
      const userId = '123';
      jest.spyOn(repo, 'findOne').mockResolvedValue(mockUser);
      
      // Act
      const result = await service.getUser(userId);
      
      // Assert
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when ID does not exist', () => {
      // Arrange
      const userId = 'invalid';
      jest.spyOn(repo, 'findOne').mockResolvedValue(null);
      
      // Act & Assert
      await expect(service.getUser(userId)).rejects.toThrow(NotFoundException);
    });
  });
});
```

---

## Performance Guidelines

### Frontend Performance

**MUST**:
- ✅ Lazy load images (`loading="lazy"`)
- ✅ Virtual scrolling per liste >100 items
- ✅ Debounce/throttle user input handlers
- ✅ Web workers per heavy computation
- ✅ Service workers per offline capability

**Metrics**:
- First Contentful Paint (FCP): < 1.8s
- Largest Contentful Paint (LCP): < 2.5s
- Time to Interactive (TTI): < 3.8s
- Total Blocking Time (TBT): < 200ms

### Backend Performance

**MUST**:
- ✅ Caching per query frequenti (Redis)
- ✅ Connection pooling per database
- ✅ Batch operations invece di N singole
- ✅ Background jobs per operazioni pesanti
- ✅ Rate limiting per API pubbliche

**Metrics**:
- API endpoint latency p95: < 500ms
- Database query p95: < 100ms
- Memory usage: < 512MB per pod
- CPU usage: < 70% steady state

**Examples**:

```typescript
// ❌ BAD - query per ogni user in loop
async enrichQuotations(quotations: Quotation[]) {
  for (const q of quotations) {
    q.user = await this.userService.findById(q.userId); // N queries
  }
}

// ✅ GOOD - single batch query
async enrichQuotations(quotations: Quotation[]) {
  const userIds = quotations.map(q => q.userId);
  const users = await this.userService.findByIds(userIds); // 1 query
  const userMap = new Map(users.map(u => [u.id, u]));
  
  quotations.forEach(q => {
    q.user = userMap.get(q.userId);
  });
}
```

---

## Security Best Practices

### Input Validation

**MUST**:
- ✅ Validate ALL user inputs (DTOs, query params, headers)
- ✅ Sanitize HTML se rendered (XSS prevention)
- ✅ Rate limiting per sensitive endpoints
- ✅ CORS configuration appropriata

### Authentication/Authorization

**MUST**:
- ✅ JWT con expiry ragionevole (15min access, 7d refresh)
- ✅ Role-based access control (RBAC)
- ✅ Resource-level authorization (`user.id === resource.ownerId`)
- ✅ Audit log per azioni sensibili

**MUST NOT**:
- ❌ Store passwords in plain text
- ❌ Log sensitive data (tokens, passwords)
- ❌ Trust client-side authorization
- ❌ Expose stack traces in production

---

## Code Review Checklist

Prima di approvare PR, verificare:

**Functionality**:
- [ ] Codice fa quello che deve fare
- [ ] Edge cases gestiti
- [ ] Errors gestiti appropriately

**Quality**:
- [ ] No code duplication (DRY)
- [ ] Functions < 50 righe
- [ ] Naming chiaro e consistente
- [ ] Comments solo per WHY, non WHAT

**Performance**:
- [ ] No N+1 queries
- [ ] Pagination per liste
- [ ] Indexes su queries nuove
- [ ] No memory leaks (unsubscribe)

**Testing**:
- [ ] Test per new logic
- [ ] Coverage threshold rispettato
- [ ] Test passano in CI

**Security**:
- [ ] Input validation presente
- [ ] No secrets hardcoded
- [ ] Authorization checks corretti

**Architecture**:
- [ ] Segue pattern esistenti
- [ ] Dependency graph accettabile
- [ ] No circular dependencies

---

## Enforcement

Questi principi sono enforced tramite:
1. **Git hooks** - Pre-commit validation
2. **CI/CD** - Build blocca se test/coverage falliscono
3. **Code review** - PR checklist mandatory
4. **Linting** - ESLint + Prettier
5. **SonarQube** - Code smell detection (se disponibile)

Skill da applicare in ogni sessione di sviluppo e code review.
