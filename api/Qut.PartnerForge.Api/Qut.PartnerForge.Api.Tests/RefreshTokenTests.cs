using Qut.PartnerForge.Api.Controllers;
using Qut.PartnerForge.Api.Data;
using Qut.PartnerForge.Api.Interfaces;
using Qut.PartnerForge.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Moq;

namespace Qut.PartnerForge.Api.Tests;

/// <summary>
/// Behaviour of the refresh token flow (#39): rotation, single use, reuse detection,
/// expiry, and logout revocation.
/// </summary>
public class RefreshTokenTests
{
    // ---------- happy path ----------

    [Fact]
    public async Task Refresh_ReturnsNewAccessToken_WhenTokenIsValid()
    {
        await using var context = CreateContext();
        var user = await SeedUserAsync(context);
        var stored = await SeedTokenAsync(context, user, "original");
        var controller = CreateController(context);

        var response = await controller.Refresh(new RefreshRequest("original"));

        var ok = Assert.IsType<OkObjectResult>(response.Result);
        var body = Assert.IsType<AuthResponse>(ok.Value);
        Assert.Equal("jwt-token", body.Token);
        Assert.Equal(user.Email, body.Email);
        Assert.Equal(15 * 60, body.ExpiresInSeconds);
        Assert.NotEqual("original", body.RefreshToken);
    }

    [Fact]
    public async Task Refresh_RotatesToken_RevokingTheOnePresented()
    {
        await using var context = CreateContext();
        var user = await SeedUserAsync(context);
        await SeedTokenAsync(context, user, "original");
        var controller = CreateController(context);

        var response = await controller.Refresh(new RefreshRequest("original"));
        var body = (AuthResponse)((OkObjectResult)response.Result!).Value!;

        var old = await context.RefreshTokens.SingleAsync(t => t.TokenHash == Hash("original"));
        Assert.NotNull(old.RevokedAt);
        Assert.Equal(Hash(body.RefreshToken), old.ReplacedByTokenHash);

        // the replacement exists and is usable
        var replacement = await context.RefreshTokens.SingleAsync(t => t.TokenHash == Hash(body.RefreshToken));
        Assert.Null(replacement.RevokedAt);
        Assert.True(replacement.IsActive);
    }

    [Fact]
    public async Task Refresh_StoresOnlyTheHash_NeverTheRawToken()
    {
        await using var context = CreateContext();
        var user = await SeedUserAsync(context);
        await SeedTokenAsync(context, user, "original");
        var controller = CreateController(context);

        var response = await controller.Refresh(new RefreshRequest("original"));
        var body = (AuthResponse)((OkObjectResult)response.Result!).Value!;

        var hashes = await context.RefreshTokens.Select(t => t.TokenHash).ToListAsync();
        Assert.DoesNotContain("original", hashes);
        Assert.DoesNotContain(body.RefreshToken, hashes);
    }

    // ---------- rejection paths ----------

    [Fact]
    public async Task Refresh_ReturnsUnauthorized_WhenTokenIsUnknown()
    {
        await using var context = CreateContext();
        await SeedUserAsync(context);
        var controller = CreateController(context);

        var response = await controller.Refresh(new RefreshRequest("never-issued"));

        Assert.IsType<UnauthorizedObjectResult>(response.Result);
    }

    [Fact]
    public async Task Refresh_ReturnsUnauthorized_WhenTokenIsExpired()
    {
        await using var context = CreateContext();
        var user = await SeedUserAsync(context);
        await SeedTokenAsync(context, user, "stale", expiresAt: DateTime.UtcNow.AddMinutes(-1));
        var controller = CreateController(context);

        var response = await controller.Refresh(new RefreshRequest("stale"));

        Assert.IsType<UnauthorizedObjectResult>(response.Result);
    }

    [Fact]
    public async Task Refresh_ReturnsUnauthorized_WhenUserIsDeactivated()
    {
        await using var context = CreateContext();
        var user = await SeedUserAsync(context);
        await SeedTokenAsync(context, user, "original");
        user.IsActive = false;
        await context.SaveChangesAsync();
        var controller = CreateController(context);

        var response = await controller.Refresh(new RefreshRequest("original"));

        Assert.IsType<UnauthorizedObjectResult>(response.Result);
    }

    // ---------- reuse detection ----------

    [Fact]
    public async Task Refresh_RevokesEveryActiveToken_WhenARevokedTokenIsReplayed()
    {
        await using var context = CreateContext();
        var user = await SeedUserAsync(context);
        await SeedTokenAsync(context, user, "original");
        var controller = CreateController(context);

        // legitimate client rotates once
        var first = await controller.Refresh(new RefreshRequest("original"));
        var issued = (AuthResponse)((OkObjectResult)first.Result!).Value!;

        // attacker replays the token the client already exchanged
        var replay = await controller.Refresh(new RefreshRequest("original"));

        Assert.IsType<UnauthorizedObjectResult>(replay.Result);

        // the whole family is dead, so the stolen replacement is useless too
        var stillActive = await context.RefreshTokens.Where(t => t.RevokedAt == null).ToListAsync();
        Assert.Empty(stillActive);

        var afterReplay = await controller.Refresh(new RefreshRequest(issued.RefreshToken));
        Assert.IsType<UnauthorizedObjectResult>(afterReplay.Result);
    }

    // ---------- logout ----------

    [Fact]
    public async Task Logout_RevokesTheToken()
    {
        await using var context = CreateContext();
        var user = await SeedUserAsync(context);
        await SeedTokenAsync(context, user, "original");
        var controller = CreateController(context);

        var result = await controller.Logout(new RefreshRequest("original"));

        Assert.IsType<NoContentResult>(result);
        var stored = await context.RefreshTokens.SingleAsync();
        Assert.NotNull(stored.RevokedAt);

        var afterLogout = await controller.Refresh(new RefreshRequest("original"));
        Assert.IsType<UnauthorizedObjectResult>(afterLogout.Result);
    }

    [Fact]
    public async Task Logout_ReturnsNoContent_ForAnUnknownToken()
    {
        await using var context = CreateContext();
        await SeedUserAsync(context);
        var controller = CreateController(context);

        // must not become an oracle for which tokens exist
        var result = await controller.Logout(new RefreshRequest("never-issued"));

        Assert.IsType<NoContentResult>(result);
    }

    // ---------- helpers ----------

    // Deterministic stand-in for the real SHA-256 hashing, which AuthServiceTests covers.
    private static string Hash(string raw) => $"hash:{raw}";

    private static AuthController CreateController(ApplicationDbContext context)
    {
        var auth = new Mock<IAuthService>();
        auth.Setup(a => a.GenerateJwtToken(It.IsAny<User>())).Returns("jwt-token");
        auth.Setup(a => a.HashRefreshToken(It.IsAny<string>())).Returns<string>(Hash);

        var issued = 0;
        auth.Setup(a => a.GenerateRefreshToken()).Returns(() => $"rotated-{++issued}");

        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Jwt:ExpiryInMinutes"] = "15",
            ["Jwt:RefreshTokenExpiryInDays"] = "14"
        }).Build();

        return new AuthController(context, auth.Object, config);
    }

    private static async Task<User> SeedUserAsync(ApplicationDbContext context)
    {
        var role = new Role { Id = 1, Name = "course_organiser" };
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "refresh@example.com",
            PasswordHash = "hashed",
            FullName = "Refresh User",
            RoleId = role.Id,
            Role = role,
            IsActive = true
        };
        context.Roles.Add(role);
        context.Users.Add(user);
        await context.SaveChangesAsync();
        return user;
    }

    private static async Task<RefreshToken> SeedTokenAsync(
        ApplicationDbContext context, User user, string rawToken, DateTime? expiresAt = null)
    {
        var token = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = Hash(rawToken),
            ExpiresAt = expiresAt ?? DateTime.UtcNow.AddDays(14),
            CreatedAt = DateTime.UtcNow,
        };
        context.RefreshTokens.Add(token);
        await context.SaveChangesAsync();
        return token;
    }

    private static ApplicationDbContext CreateContext() =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);
}
