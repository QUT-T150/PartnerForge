using Qut.PartnerForge.Api.Data;
using Qut.PartnerForge.Api.HealthChecks;
using Qut.PartnerForge.Api.Interceptors;
using Qut.PartnerForge.Api.Interfaces;
using Qut.PartnerForge.Api.Models;
using Qut.PartnerForge.Api.Options;
using Qut.PartnerForge.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using System.Security.Cryptography;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddPolicy("DevCors", policy =>
    {
        policy.WithOrigins(
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:5500",
                "http://127.0.0.1:5500",
                "http://localhost:5501",
                "http://127.0.0.1:5501",
                "https://qpf-frontend-staging.up.railway.app"
              )
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

builder.Services.AddHttpContextAccessor();
builder.Services.AddControllers();
builder.Services.AddOpenApi();
var connectionString = builder.Configuration.GetConnectionString("Default");
var mysqlVersion = builder.Configuration["Database:MySqlVersion"];
builder.Services.AddScoped<AuditSaveChangesInterceptor>();
builder.Services.AddDbContext<ApplicationDbContext>((serviceProvider, options) =>
    options.UseMySql(connectionString, new MySqlServerVersion(new Version(mysqlVersion!)))
           .AddInterceptors(serviceProvider.GetRequiredService<AuditSaveChangesInterceptor>()));
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IAnalyticsService, AnalyticsService>();
builder.Services.AddSingleton<IFilterFieldService, FilterFieldService>();
builder.Services.AddHealthChecks()
    .AddCheck<DatabaseHealthCheck>("database");

// Asymmetric JWT validation — only the public key is needed here.
// Tokens are signed with the private key (in AuthService) so even if the
// public key is exposed, nobody can forge tokens without the private key.
var validationRsa = RSA.Create();
validationRsa.ImportFromPem(builder.Configuration["Jwt:PublicKeyPem"]!);

builder.Services.AddAuthentication(x =>
{
    x.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    x.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    x.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
}).AddJwtBearer(x =>
{
    x.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new RsaSecurityKey(validationRsa),
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization();

builder.Services.Configure<AuthRateLimitingOptions>(
    builder.Configuration.GetSection(AuthRateLimitingOptions.SectionName));

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.AddPolicy("AuthLoginPolicy", context =>
    {
        var clientIp = context.Connection.RemoteIpAddress?.ToString()
            ?? context.Request.Headers["X-Forwarded-For"].FirstOrDefault()
            ?? "unknown";

        var rateLimitOptions = builder.Configuration
            .GetSection(AuthRateLimitingOptions.SectionName)
            .Get<AuthRateLimitingOptions>() ?? new AuthRateLimitingOptions();

        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: clientIp,
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = rateLimitOptions.PermitLimit,
                Window = TimeSpan.FromSeconds(rateLimitOptions.WindowSeconds),
                QueueLimit = rateLimitOptions.QueueLimit,
                AutoReplenishment = true
            });
    });

    options.OnRejected = async (context, cancellationToken) =>
    {
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;

        var retryAfterSeconds = 0;
        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
        {
            retryAfterSeconds = (int)Math.Max(1, Math.Ceiling(retryAfter.TotalSeconds));
            context.HttpContext.Response.Headers.RetryAfter = retryAfterSeconds.ToString();
        }

        var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
        var clientIp = context.HttpContext.Connection.RemoteIpAddress?.ToString()
            ?? context.HttpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault()
            ?? "unknown";

        logger.LogWarning("Rate limit exceeded for IP {IpAddress} on {Path}. Retry-After: {RetryAfter}s",
            clientIp, context.HttpContext.Request.Path, retryAfterSeconds);

        context.HttpContext.Response.ContentType = "application/json";
        await context.HttpContext.Response.WriteAsJsonAsync(new
        {
            error = "Too many requests. Please try again later.",
            retryAfterSeconds = retryAfterSeconds
        }, cancellationToken);
    };
});

builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "Qut.PartnerForge API", Version = "v1" });
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        In = ParameterLocation.Header,
        Description = "Enter your JWT token.",
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        BearerFormat = "JWT",
        Scheme = "Bearer",
    });
    options.AddSecurityRequirement(document => new()
    {
        [new OpenApiSecuritySchemeReference("Bearer", document)] = []
    });
});

var app = builder.Build();

// Seed the default admin user on a fresh database
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    var auth = scope.ServiceProvider.GetRequiredService<IAuthService>();

    if (!db.Users.Any())
    {
        var adminRole = db.Roles.FirstOrDefault(r => r.Name == "admin");
        if (adminRole == null)
        {
            adminRole = new Role { Id = 1, Name = "admin", Description = "Full access. Approves submissions, manages users." };
            db.Roles.Add(adminRole);
            db.SaveChanges();
        }

        db.Users.Add(new User
        {
            Id = Guid.NewGuid(),
            Email = "admin@system.com",
            PasswordHash = auth.HashPassword("Admin123!"),
            FullName = "System Administrator",
            RoleId = adminRole.Id,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        db.SaveChanges();
    }
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("DevCors");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
// Anonymous liveness + DB check for docker compose healthchecks: 200 "Healthy" or 503 "Unhealthy".
app.MapHealthChecks("/health");

app.Run();

/// <summary>
/// Exposes the Program type for WebApplicationFactory in integration tests.
/// </summary>
public partial class Program { }
