using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Qut.PartnerForge.Api.Data;
using Qut.PartnerForge.Api.Interceptors;
using Qut.PartnerForge.Api.Models;
using Qut.PartnerForge.Api.Options;

namespace Qut.PartnerForge.Api.Tests;

public class RateLimitingTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public RateLimitingTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public void AuthRateLimitingOptions_DefaultsAreValid()
    {
        var options = new AuthRateLimitingOptions();
        Assert.Equal(10, options.PermitLimit);
        Assert.Equal(60, options.WindowSeconds);
        Assert.Equal(0, options.QueueLimit);
        Assert.Equal("RateLimiting:Auth", AuthRateLimitingOptions.SectionName);
    }

    [Fact]
    public async Task LoginEndpoint_ThrottlesAfterPermitLimitExceeded_AndIncludesRetryAfterHeader()
    {
        var inMemoryDb = Guid.NewGuid().ToString();
        var clientFactory = _factory.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Testing");
            builder.ConfigureAppConfiguration((_, config) =>
            {
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["RateLimiting:Auth:PermitLimit"] = "3",
                    ["RateLimiting:Auth:WindowSeconds"] = "60",
                    ["RateLimiting:Auth:QueueLimit"] = "0"
                });
            });

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
        });

        var client = clientFactory.CreateClient();
        var clientIp = "198.51.100.25";
        var loginPayload = new LoginRequest("test@example.com", "WrongPassword123!");

        // 3 requests within permit limit -> rejected by auth controller (401), not rate limiter (429)
        for (var i = 1; i <= 3; i++)
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/login")
            {
                Content = JsonContent.Create(loginPayload)
            };
            request.Headers.Add("X-Forwarded-For", clientIp);

            var response = await client.SendAsync(request);
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        // 4th request exceeds permit limit -> rejected by rate limiter (429)
        using var throttledRequest = new HttpRequestMessage(HttpMethod.Post, "/api/auth/login")
        {
            Content = JsonContent.Create(loginPayload)
        };
        throttledRequest.Headers.Add("X-Forwarded-For", clientIp);

        var throttledResponse = await client.SendAsync(throttledRequest);
        Assert.Equal(HttpStatusCode.TooManyRequests, throttledResponse.StatusCode);

        // Verify Retry-After header is present and valid
        Assert.NotNull(throttledResponse.Headers.RetryAfter);
        Assert.True(throttledResponse.Headers.RetryAfter.Delta.HasValue || throttledResponse.Headers.RetryAfter.Date.HasValue);

        // Verify JSON response body
        var content = await throttledResponse.Content.ReadAsStringAsync();
        var json = JsonNode.Parse(content);
        Assert.NotNull(json);
        Assert.NotNull(json!["error"]);
        Assert.NotNull(json!["retryAfterSeconds"]);
    }

    [Fact]
    public async Task LoginEndpoint_PartitionsByClientIp_UnthrottledIpIsAllowed()
    {
        var inMemoryDb = Guid.NewGuid().ToString();
        var clientFactory = _factory.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Testing");
            builder.ConfigureAppConfiguration((_, config) =>
            {
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["RateLimiting:Auth:PermitLimit"] = "2",
                    ["RateLimiting:Auth:WindowSeconds"] = "60",
                    ["RateLimiting:Auth:QueueLimit"] = "0"
                });
            });

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
        });

        var client = clientFactory.CreateClient();
        var attackerIp = "203.0.113.50";
        var legitimateUserIp = "203.0.113.99";
        var loginPayload = new LoginRequest("user@example.com", "WrongPassword123!");

        // Exhaust quota for attacker IP (2 permits)
        for (var i = 1; i <= 2; i++)
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/login")
            {
                Content = JsonContent.Create(loginPayload)
            };
            request.Headers.Add("X-Forwarded-For", attackerIp);
            var res = await client.SendAsync(request);
            Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
        }

        // Attacker's 3rd request is 429
        using (var attackerRequest = new HttpRequestMessage(HttpMethod.Post, "/api/auth/login")
        {
            Content = JsonContent.Create(loginPayload)
        })
        {
            attackerRequest.Headers.Add("X-Forwarded-For", attackerIp);
            var attackerRes = await client.SendAsync(attackerRequest);
            Assert.Equal(HttpStatusCode.TooManyRequests, attackerRes.StatusCode);
        }

        // Legitimate user from a different IP is unaffected and reaches auth (401)
        using (var legitimateRequest = new HttpRequestMessage(HttpMethod.Post, "/api/auth/login")
        {
            Content = JsonContent.Create(loginPayload)
        })
        {
            legitimateRequest.Headers.Add("X-Forwarded-For", legitimateUserIp);
            var legitimateRes = await client.SendAsync(legitimateRequest);
            Assert.Equal(HttpStatusCode.Unauthorized, legitimateRes.StatusCode);
        }
    }
}
