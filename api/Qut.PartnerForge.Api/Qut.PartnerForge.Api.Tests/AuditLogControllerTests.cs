using Qut.PartnerForge.Api.Controllers;
using Qut.PartnerForge.Api.Data;
using Qut.PartnerForge.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Qut.PartnerForge.Api.Tests;

public class AuditLogControllerTests
{
    private static readonly Guid Alice = Guid.NewGuid();
    private static readonly Guid Bob = Guid.NewGuid();

    [Fact]
    public void Controller_RequiresAdminRole()
    {
        var attribute = typeof(AuditLogController)
            .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
            .Cast<AuthorizeAttribute>()
            .Single();

        Assert.Equal("admin,course_organiser", attribute.Roles);
    }

    [Fact]
    public async Task GetAuditLog_ReturnsNewestFirst_WithActingUserResolved()
    {
        await using var context = await SeedContext();
        var controller = new AuditLogController(context);

        var page = await Invoke(controller);

        Assert.Equal(5, page.TotalCount);
        Assert.Equal(5, page.Items.Count);
        Assert.True(page.Items[0].Id > page.Items[^1].Id);
        var aliceRow = page.Items.First(i => i.ChangedBy == Alice);
        Assert.Equal("Alice Admin", aliceRow.ChangedByName);
        Assert.Equal("alice@example.com", aliceRow.ChangedByEmail);
    }

    [Fact]
    public async Task GetAuditLog_FiltersByActionTableUserAndDateRange()
    {
        await using var context = await SeedContext();
        var controller = new AuditLogController(context);

        var byAction = await Invoke(controller, action: "SOFT_DELETE");
        Assert.All(byAction.Items, i => Assert.Equal("SOFT_DELETE", i.Action));
        Assert.Equal(1, byAction.TotalCount);

        var byTable = await Invoke(controller, tableName: "projects");
        Assert.All(byTable.Items, i => Assert.Equal("projects", i.TableName));
        Assert.Equal(2, byTable.TotalCount);

        var byUser = await Invoke(controller, changedBy: Bob);
        Assert.All(byUser.Items, i => Assert.Equal(Bob, i.ChangedBy));
        Assert.Equal(2, byUser.TotalCount);

        var byDate = await Invoke(
            controller,
            from: new DateTime(2026, 8, 3, 0, 0, 0, DateTimeKind.Utc),
            to: new DateTime(2026, 8, 4, 23, 59, 59, DateTimeKind.Utc));
        Assert.Equal(2, byDate.TotalCount);
    }

    [Fact]
    public async Task GetAuditLog_PagesResults()
    {
        await using var context = await SeedContext();
        var controller = new AuditLogController(context);

        var firstPage = await Invoke(controller, page: 1, pageSize: 2);
        var thirdPage = await Invoke(controller, page: 3, pageSize: 2);

        Assert.Equal(5, firstPage.TotalCount);
        Assert.Equal(2, firstPage.Items.Count);
        Assert.Single(thirdPage.Items);
        Assert.True(firstPage.Items[0].Id > thirdPage.Items[0].Id);
    }

    [Fact]
    public async Task GetTables_ReturnsDistinctSortedTableNames()
    {
        await using var context = await SeedContext();
        var controller = new AuditLogController(context);

        var result = await controller.GetTables();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var tables = Assert.IsAssignableFrom<IEnumerable<string>>(ok.Value).ToList();
        Assert.Equal(new[] { "organisations", "projects", "users" }, tables);
    }

    private static async Task<AuditLogPageDto> Invoke(
        AuditLogController controller,
        string? action = null,
        string? tableName = null,
        Guid? recordId = null,
        Guid? changedBy = null,
        DateTime? from = null,
        DateTime? to = null,
        int page = 1,
        int pageSize = 25)
    {
        var result = await controller.GetAuditLog(action, tableName, recordId, changedBy, from, to, page, pageSize);
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        return Assert.IsType<AuditLogPageDto>(ok.Value);
    }

    private static async Task<ApplicationDbContext> SeedContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var context = new ApplicationDbContext(options);

        var role = new Role { Id = 1, Name = "admin" };
        context.Roles.Add(role);
        context.Users.AddRange(
            new User { Id = Alice, Email = "alice@example.com", FullName = "Alice Admin", RoleId = role.Id },
            new User { Id = Bob, Email = "bob@example.com", FullName = "Bob Builder", RoleId = role.Id });

        var day = (int d) => new DateTime(2026, 8, d, 12, 0, 0, DateTimeKind.Utc);
        context.AuditLog.AddRange(
            new AuditLog { TableName = "organisations", RecordId = Guid.NewGuid(), Action = "INSERT", ChangedBy = Alice, ChangedAt = day(1) },
            new AuditLog { TableName = "organisations", RecordId = Guid.NewGuid(), Action = "UPDATE", ChangedBy = Bob, ChangedAt = day(2) },
            new AuditLog { TableName = "projects", RecordId = Guid.NewGuid(), Action = "INSERT", ChangedBy = Alice, ChangedAt = day(3) },
            new AuditLog { TableName = "projects", RecordId = Guid.NewGuid(), Action = "SOFT_DELETE", ChangedBy = Bob, ChangedAt = day(4) },
            new AuditLog { TableName = "users", RecordId = Guid.NewGuid(), Action = "UPDATE", ChangedBy = null, ChangedAt = day(5) });
        await context.SaveChangesAsync();
        return context;
    }
}