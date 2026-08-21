using Qut.PartnerForge.Api.Controllers;
using Qut.PartnerForge.Api.Data;
using Qut.PartnerForge.Api.Interfaces;
using Qut.PartnerForge.Api.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using System.Security.Claims;

namespace Qut.PartnerForge.Api.Tests;

/// <summary>
/// Row-level scoping tests for the 5-role model: industry-side roles only see their own
/// organisation's records; course_organiser is scoped by faculty (or approved orgs as fallback);
/// admin sees everything.
/// </summary>
public class RoleScopingTests
{
    [Theory]
    [InlineData("industry_partner")]
    [InlineData("industry_team")]
    [InlineData("industry_team_manager")]
    public async Task Organisations_IndustryRoles_OnlySeeOwnOrg(string role)
    {
        await using var context = CreateContext();
        var (orgA, orgB) = await SeedTwoOrganisations(context);
        var controller = new OrganisationsController(context)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = CreateHttpContext(role, organisationId: orgA.Id)
            }
        };

        var result = await controller.GetOrganisations(search: null, status: null, industryId: null);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var orgs = Assert.IsAssignableFrom<IEnumerable<OrganisationListItemDto>>(ok.Value).ToList();
        var org = Assert.Single(orgs);
        Assert.Equal(orgA.Id, org.Id);
    }

    [Fact]
    public async Task Organisations_Admin_SeesAll()
    {
        await using var context = CreateContext();
        await SeedTwoOrganisations(context);
        var controller = new OrganisationsController(context)
        {
            ControllerContext = new ControllerContext { HttpContext = CreateHttpContext("admin") }
        };

        var result = await controller.GetOrganisations(search: null, status: null, industryId: null);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var orgs = Assert.IsAssignableFrom<IEnumerable<OrganisationListItemDto>>(ok.Value).ToList();
        Assert.Equal(2, orgs.Count);
    }

    [Fact]
    public async Task Organisations_CourseOrganiser_OnlySeesApproved()
    {
        await using var context = CreateContext();
        context.Organisations.AddRange(
            new Organisation { Id = Guid.NewGuid(), Name = "Approved Co", SubmissionStatus = "approved" },
            new Organisation { Id = Guid.NewGuid(), Name = "Pending Co", SubmissionStatus = "pending" });
        await context.SaveChangesAsync();
        var controller = new OrganisationsController(context)
        {
            ControllerContext = new ControllerContext { HttpContext = CreateHttpContext("course_organiser") }
        };

        var result = await controller.GetOrganisations(search: null, status: null, industryId: null);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var orgs = Assert.IsAssignableFrom<IEnumerable<OrganisationListItemDto>>(ok.Value).ToList();
        var org = Assert.Single(orgs);
        Assert.Equal("Approved Co", org.Name);
    }

    [Theory]
    [InlineData("industry_partner")]
    [InlineData("industry_team")]
    [InlineData("industry_team_manager")]
    public async Task Projects_IndustryRoles_OnlySeeOwnOrgsProjects(string role)
    {
        await using var context = CreateContext();
        var (orgA, orgB) = await SeedTwoOrganisations(context);
        context.Projects.AddRange(
            NewProject(orgA.Id, "A's project"),
            NewProject(orgB.Id, "B's project"));
        await context.SaveChangesAsync();
        var controller = new ProjectsController(context)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = CreateHttpContext(role, organisationId: orgA.Id)
            }
        };

        var result = await controller.GetProjects(search: null, status: null, semester: null, year: null, organisationId: null);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var projects = Assert.IsAssignableFrom<IEnumerable<ProjectListItemDto>>(ok.Value).ToList();
        var project = Assert.Single(projects);
        Assert.Equal("A's project", project.Title);
    }

    [Fact]
    public async Task Projects_CourseOrganiser_ScopedByFaculty()
    {
        await using var context = CreateContext();
        var (orgA, _) = await SeedTwoOrganisations(context);
        var facultyOneProject = NewProject(orgA.Id, "Faculty 1 project");
        facultyOneProject.FacultyId = 1;
        var facultyTwoProject = NewProject(orgA.Id, "Faculty 2 project");
        facultyTwoProject.FacultyId = 2;
        context.Projects.AddRange(facultyOneProject, facultyTwoProject);
        await context.SaveChangesAsync();
        var controller = new ProjectsController(context)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = CreateHttpContext("course_organiser", facultyId: 1)
            }
        };

        var result = await controller.GetProjects(search: null, status: null, semester: null, year: null, organisationId: null);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var projects = Assert.IsAssignableFrom<IEnumerable<ProjectListItemDto>>(ok.Value).ToList();
        var project = Assert.Single(projects);
        Assert.Equal("Faculty 1 project", project.Title);
    }

    [Fact]
    public async Task Users_IndustryTeamManager_OnlySeesOwnOrgsMembers()
    {
        await using var context = CreateContext();
        var (orgA, orgB) = await SeedTwoOrganisations(context);
        var role = new Role { Id = 10, Name = "industry_team" };
        context.Roles.Add(role);
        context.Users.AddRange(
            new User { Id = Guid.NewGuid(), Email = "a@a.com", FullName = "A Member", RoleId = role.Id, OrganisationId = orgA.Id },
            new User { Id = Guid.NewGuid(), Email = "b@b.com", FullName = "B Member", RoleId = role.Id, OrganisationId = orgB.Id });
        await context.SaveChangesAsync();
        var controller = new UsersController(context, Mock.Of<IAuthService>())
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = CreateHttpContext("industry_team_manager", organisationId: orgA.Id)
            }
        };

        var result = await controller.GetUsers(search: null, role: null, active: null);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var users = Assert.IsAssignableFrom<IEnumerable<UserListItemDto>>(ok.Value).ToList();
        var user = Assert.Single(users);
        Assert.Equal("A Member", user.FullName);
    }

    [Fact]
    public async Task Users_IndustryTeam_CannotListUsers()
    {
        // industry_team (non-manager) has no [Authorize(Roles=...)] match on GetUsers,
        // so ASP.NET's middleware would return 403 before the action runs — this test
        // documents that expectation via the attribute check rather than the action body.
        var method = typeof(UsersController).GetMethod(nameof(UsersController.GetUsers));
        var attribute = method!.GetCustomAttributes(typeof(Microsoft.AspNetCore.Authorization.AuthorizeAttribute), false)
            .Cast<Microsoft.AspNetCore.Authorization.AuthorizeAttribute>()
            .Single();

        Assert.DoesNotContain("industry_team,", attribute.Roles + ",");
    }

    private static ApplicationDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new ApplicationDbContext(options);
    }

    private static async Task<(Organisation A, Organisation B)> SeedTwoOrganisations(ApplicationDbContext context)
    {
        var orgA = new Organisation { Id = Guid.NewGuid(), Name = "Org A", SubmissionStatus = "approved" };
        var orgB = new Organisation { Id = Guid.NewGuid(), Name = "Org B", SubmissionStatus = "approved" };
        context.Organisations.AddRange(orgA, orgB);
        await context.SaveChangesAsync();
        return (orgA, orgB);
    }

    private static Project NewProject(Guid organisationId, string title) => new()
    {
        Id = Guid.NewGuid(),
        Title = title,
        OrganisationId = organisationId,
        ProjectType = "capstone",
        Semester = "S1",
        Year = 2026,
        Status = "active"
    };

    private static DefaultHttpContext CreateHttpContext(string role, Guid? organisationId = null, int? facultyId = null)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()),
            new(ClaimTypes.Role, role)
        };
        if (organisationId.HasValue)
            claims.Add(new Claim("organisation_id", organisationId.Value.ToString()));
        if (facultyId.HasValue)
            claims.Add(new Claim("faculty_id", facultyId.Value.ToString()));

        return new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity(claims, authenticationType: "Test"))
        };
    }
}