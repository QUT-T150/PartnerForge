using Qut.PartnerForge.Api.Controllers;
using Qut.PartnerForge.Api.Data;
using Qut.PartnerForge.Api.Interceptors;
using Qut.PartnerForge.Api.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using System.Net;
using System.Security.Claims;
using System.Text.Json.Nodes;

namespace Qut.PartnerForge.Api.Tests;

public class AuditLoggingTests
{
    private static readonly Guid AdminId = Guid.NewGuid();

    [Fact]
    public async Task CreateOrganisation_WritesInsertAuditRow()
    {
        var http = CreateHttpContext(AdminId, "admin");
        await using var context = CreateContext(http);
        var controller = Controller(context, http);

        await controller.CreateOrganisation(OrganisationRequest("Acme Pty Ltd"));

        var row = Assert.Single(await context.AuditLog.ToListAsync());
        Assert.Equal("organisations", row.TableName);
        Assert.Equal("INSERT", row.Action);
        Assert.Equal(AdminId, row.ChangedBy);
        Assert.Equal("127.0.0.1", row.IpAddress);
        Assert.Equal("xunit-agent", row.UserAgent);
        Assert.Null(row.OldValues);
        var newValues = Parse(row.NewValues);
        Assert.Equal("Acme Pty Ltd", newValues["name"]?.GetValue<string>());
        Assert.Equal(row.RecordId, context.Organisations.Single().Id);
    }

    [Fact]
    public async Task UpdateOrganisation_WritesUpdateAuditRow_WithOldAndNewValues()
    {
        var http = CreateHttpContext(AdminId, "admin");
        await using var context = CreateContext(http);
        var org = await SeedOrganisation(context, "Old Name");
        var controller = Controller(context, http);

        await controller.UpdateOrganisation(org.Id, OrganisationRequest("New Name"));

        var row = Assert.Single(await context.AuditLog.ToListAsync());
        Assert.Equal("UPDATE", row.Action);
        Assert.Equal(org.Id, row.RecordId);
        var oldValues = Parse(row.OldValues);
        var newValues = Parse(row.NewValues);
        Assert.Equal("Old Name", oldValues["name"]?.GetValue<string>());
        Assert.Equal("New Name", newValues["name"]?.GetValue<string>());
        // Only changed columns are snapshotted — untouched fields stay out of the diff.
        Assert.False(oldValues.ContainsKey("created_at"));
    }

    [Fact]
    public async Task DeleteOrganisation_WritesSoftDeleteAuditRow()
    {
        var http = CreateHttpContext(AdminId, "admin");
        await using var context = CreateContext(http);
        var org = await SeedOrganisation(context, "Doomed Org");
        var controller = Controller(context, http);

        await controller.DeleteOrganisation(org.Id);

        var row = Assert.Single(await context.AuditLog.ToListAsync());
        Assert.Equal("SOFT_DELETE", row.Action);
        Assert.Equal(org.Id, row.RecordId);
        Assert.Null(Parse(row.OldValues)["deleted_at"]?.GetValue<string>());
        Assert.NotNull(Parse(row.NewValues)["deleted_at"]?.GetValue<string>());
    }

    [Fact]
    public async Task RestoringSoftDeletedEntity_WritesRestoreAuditRow()
    {
        var http = CreateHttpContext(AdminId, "admin");
        await using var context = CreateContext(http);
        var org = await SeedOrganisation(context, "Phoenix Org");
        org.DeletedAt = DateTime.UtcNow;
        await context.SaveChangesAsync();

        org.DeletedAt = null;
        await context.SaveChangesAsync();

        var actions = await context.AuditLog.OrderBy(a => a.Id).Select(a => a.Action).ToListAsync();
        Assert.Equal(new[] { "SOFT_DELETE", "RESTORE" }, actions);
    }

    [Fact]
    public async Task CreateAndUpdateProject_WriteAuditRows()
    {
        var http = CreateHttpContext(AdminId, "admin");
        await using var context = CreateContext(http);
        var org = await SeedOrganisation(context, "Project Org");
        var controller = new ProjectsController(context)
        {
            ControllerContext = new ControllerContext { HttpContext = http }
        };

        await controller.CreateProject(ProjectRequest(org.Id, "Capstone Alpha"));
        var projectId = context.Projects.Single().Id;
        context.ChangeTracker.Clear();
        await controller.UpdateProject(projectId, ProjectRequest(org.Id, "Capstone Beta"));

        var rows = await context.AuditLog.OrderBy(a => a.Id).ToListAsync();
        Assert.Equal(2, rows.Count);
        Assert.Equal(("projects", "INSERT"), (rows[0].TableName, rows[0].Action));
        Assert.Equal(("projects", "UPDATE"), (rows[1].TableName, rows[1].Action));
        Assert.Equal("Capstone Alpha", Parse(rows[1].OldValues)["title"]?.GetValue<string>());
        Assert.Equal("Capstone Beta", Parse(rows[1].NewValues)["title"]?.GetValue<string>());
    }

    [Fact]
    public async Task NoOpSave_WritesNoAuditRow()
    {
        var http = CreateHttpContext(AdminId, "admin");
        await using var context = CreateContext(http);
        var org = await SeedOrganisation(context, "Steady Org");

        // Marking the entity dirty without changing any value must not produce an audit row.
        context.Organisations.Update(org);
        await context.SaveChangesAsync();

        Assert.Empty(await context.AuditLog.ToListAsync());
    }

    [Fact]
    public async Task FailedWrite_WritesNoAuditRow()
    {
        var http = CreateHttpContext(AdminId, "admin");
        await using var context = CreateContext(http);
        var controller = Controller(context, http);

        var result = await controller.UpdateOrganisation(Guid.NewGuid(), OrganisationRequest("Ghost"));

        Assert.IsType<NotFoundResult>(result);
        Assert.Empty(await context.AuditLog.ToListAsync());
    }

    [Fact]
    public async Task PasswordHash_IsRedactedInSnapshots()
    {
        var http = CreateHttpContext(AdminId, "admin");
        await using var context = CreateContext(http);
        var role = new Role { Id = 1, Name = "admin" };
        context.Roles.Add(role);
        context.Users.Add(new User
        {
            Id = Guid.NewGuid(),
            Email = "new@example.com",
            PasswordHash = "super-secret-hash",
            FullName = "New User",
            RoleId = role.Id
        });
        await context.SaveChangesAsync();

        var row = Assert.Single(await context.AuditLog.Where(a => a.TableName == "users").ToListAsync());
        Assert.DoesNotContain("super-secret-hash", row.NewValues);
        Assert.Equal("[REDACTED]", Parse(row.NewValues)["password_hash"]?.GetValue<string>());
    }

    [Fact]
    public async Task SaveWithoutHttpContext_RecordsNullActor()
    {
        await using var context = CreateContext(httpContext: null);
        context.Organisations.Add(new Organisation { Id = Guid.NewGuid(), Name = "Seeded Org" });
        await context.SaveChangesAsync();

        var row = Assert.Single(await context.AuditLog.ToListAsync());
        Assert.Null(row.ChangedBy);
        Assert.Null(row.IpAddress);
    }

    private static ApplicationDbContext CreateContext(HttpContext? httpContext)
    {
        var accessor = new Mock<IHttpContextAccessor>();
        accessor.SetupGet(a => a.HttpContext).Returns(httpContext);

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .AddInterceptors(new AuditSaveChangesInterceptor(accessor.Object))
            .Options;

        return new ApplicationDbContext(options);
    }

    private static DefaultHttpContext CreateHttpContext(Guid userId, string role)
    {
        var httpContext = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity(
                new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                    new Claim(ClaimTypes.Role, role)
                },
                authenticationType: "Test"))
        };
        httpContext.Connection.RemoteIpAddress = IPAddress.Loopback;
        httpContext.Request.Headers.UserAgent = "xunit-agent";
        return httpContext;
    }

    private static OrganisationsController Controller(ApplicationDbContext context, HttpContext httpContext) =>
        new(context) { ControllerContext = new ControllerContext { HttpContext = httpContext } };

    private static async Task<Organisation> SeedOrganisation(ApplicationDbContext context, string name)
    {
        var org = new Organisation { Id = Guid.NewGuid(), Name = name };
        context.Organisations.Add(org);
        await context.SaveChangesAsync();

        // Discard the seeding audit rows so each test asserts only on its own writes.
        context.AuditLog.RemoveRange(await context.AuditLog.ToListAsync());
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();
        return await context.Organisations.SingleAsync(o => o.Id == org.Id);
    }

    private static SaveOrganisationRequest OrganisationRequest(string name) => new(
        RegistrationId: null,
        Name: name,
        Abn: null,
        IndustryId: null,
        Email: null,
        Website: null,
        Phone: null,
        AddressLine1: null,
        AddressLine2: null,
        City: null,
        State: null,
        Postcode: null,
        Country: null,
        OrganisationInformation: null,
        PrimaryContactName: null,
        PrimaryContactPosition: null,
        PrimaryContactEmail: null,
        PrimaryContactPhone: null,
        PartnershipStatus: "prospect",
        Notes: null);

    private static SaveProjectRequest ProjectRequest(Guid organisationId, string title) => new(
        Title: title,
        Description: null,
        OrganisationId: organisationId,
        FacultyId: null,
        ProjectType: "capstone",
        Semester: "S1",
        Year: 2026,
        Status: "active",
        StartDate: null,
        EndDate: null,
        MultipleTeams: false,
        DisciplineArea: null,
        SecondaryItDiscipline: null,
        ProjectDeliverables: null,
        ProjectPartnerAgreement: null,
        StudentProjectAgreement: null,
        IpAssignmentRationale: null,
        Notes: null);

    private static JsonObject Parse(string? json)
    {
        Assert.NotNull(json);
        var node = JsonNode.Parse(json!);
        Assert.NotNull(node);
        return node!.AsObject();
    }
}
