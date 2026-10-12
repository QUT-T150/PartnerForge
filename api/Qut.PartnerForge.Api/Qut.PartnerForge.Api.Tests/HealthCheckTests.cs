using System.Net;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Qut.PartnerForge.Api.Data;
using Qut.PartnerForge.Api.HealthChecks;
using Qut.PartnerForge.Api.Interceptors;

namespace Qut.PartnerForge.Api.Tests;

public class HealthCheckTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public HealthCheckTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task HealthEndpoint_ReturnsHealthy_WithoutAuthentication()
    {
        var inMemoryDb = Guid.NewGuid().ToString();
        var client = _factory.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Testing");
            builder.ConfigureServices(services =>
            {
                var descriptors = services.Where(d =>
                    d.ServiceType == typeof(DbContextOptions) ||
                    d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>) ||
                    d.ServiceType == typeof(ApplicationDbContext) ||
                    (d.ServiceType.FullName != null && d.ServiceType.FullName.Contains("EntityFrameworkCore"))
                ).ToList();

                foreach (var descriptor in descriptors)
                    services.Remove(descriptor);

                services.AddDbContext<ApplicationDbContext>((sp, options) =>
                {
                    options.UseInMemoryDatabase(inMemoryDb)
                           .AddInterceptors(sp.GetRequiredService<AuditSaveChangesInterceptor>());
                });
            });
        }).CreateClient();

        // No bearer token: compose healthchecks call this anonymously.
        var response = await client.GetAsync("/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Healthy", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task DatabaseHealthCheck_ReportsUnhealthy_WhenDatabaseUnreachable()
    {
        // Nothing listens on port 1, so the connection is refused immediately.
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseMySql("Server=127.0.0.1;Port=1;Database=none;User=none;Password=none;Connect Timeout=2",
                new MySqlServerVersion(new Version(8, 4, 0)))
            .Options;
        await using var db = new ApplicationDbContext(options);

        var result = await new DatabaseHealthCheck(db).CheckHealthAsync(new HealthCheckContext());

        Assert.Equal(HealthStatus.Unhealthy, result.Status);
    }
}
