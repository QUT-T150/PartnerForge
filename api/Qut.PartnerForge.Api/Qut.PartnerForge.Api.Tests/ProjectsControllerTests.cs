using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Qut.PartnerForge.Api.Controllers;
using Qut.PartnerForge.Api.Data;
using Qut.PartnerForge.Api.Models;

namespace Qut.PartnerForge.Api.Tests;

public class ProjectsControllerTests
{
    private static readonly Guid AdminUserId = Guid.NewGuid();
    private static readonly Guid OrgAId = Guid.NewGuid();
    private static readonly Guid OrgBId = Guid.NewGuid();

    [Fact]
    public async Task GetProjects_Admin_ReturnsAllActiveProjects()
    {
        await using var context = CreateContext();
        var orgA = new Organisation { Id = OrgAId, Name = "Org A", SubmissionStatus = "approved" };
        var orgB = new Organisation { Id = OrgBId, Name = "Org B", SubmissionStatus = "approved" };
        context.Organisations.AddRange(orgA, orgB);

        context.Projects.AddRange(
            new Project { Id = Guid.NewGuid(), Title = "Project 1", OrganisationId = OrgAId, ProjectType = "capstone", Semester = "S1", Year = 2026, Status = "ongoing" },
            new Project { Id = Guid.NewGuid(), Title = "Project 2", OrganisationId = OrgBId, ProjectType = "undergrad", Semester = "S2", Year = 2026, Status = "ongoing" }
        );
        await context.SaveChangesAsync();

        var controller = CreateController(context, "admin");
        var result = await controller.GetProjects(null, null, null, null, null);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var items = Assert.IsAssignableFrom<IEnumerable<ProjectListItemDto>>(ok.Value);
        Assert.Equal(2, items.Count());
    }

    [Fact]
    public async Task GetProjects_CourseOrganiser_FiltersByFacultyWhenFacultyClaimPresent()
    {
        await using var context = CreateContext();
        var org = new Organisation { Id = OrgAId, Name = "Org A", SubmissionStatus = "approved" };
        context.Organisations.Add(org);

        context.Projects.AddRange(
            new Project { Id = Guid.NewGuid(), Title = "Science Project", OrganisationId = OrgAId, FacultyId = 1, ProjectType = "capstone", Semester = "S1", Year = 2026, Status = "ongoing" },
            new Project { Id = Guid.NewGuid(), Title = "Engineering Project", OrganisationId = OrgAId, FacultyId = 2, ProjectType = "capstone", Semester = "S1", Year = 2026, Status = "ongoing" }
        );
        await context.SaveChangesAsync();

        var controller = CreateController(context, "course_organiser", facultyId: 1);
        var result = await controller.GetProjects(null, null, null, null, null);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var items = Assert.IsAssignableFrom<IEnumerable<ProjectListItemDto>>(ok.Value).ToList();
        var single = Assert.Single(items);
        Assert.Equal("Science Project", single.Title);
    }

    [Fact]
    public async Task GetProjects_IndustryPartner_ReturnsOnlyOwnProjects()
    {
        await using var context = CreateContext();
        var orgA = new Organisation { Id = OrgAId, Name = "Org A", SubmissionStatus = "approved" };
        var orgB = new Organisation { Id = OrgBId, Name = "Org B", SubmissionStatus = "approved" };
        context.Organisations.AddRange(orgA, orgB);

        context.Projects.AddRange(
            new Project { Id = Guid.NewGuid(), Title = "Partner A Project", OrganisationId = OrgAId, ProjectType = "capstone", Semester = "S1", Year = 2026, Status = "ongoing" },
            new Project { Id = Guid.NewGuid(), Title = "Partner B Project", OrganisationId = OrgBId, ProjectType = "capstone", Semester = "S1", Year = 2026, Status = "ongoing" }
        );
        await context.SaveChangesAsync();

        var controller = CreateController(context, "industry_partner", organisationId: OrgAId);
        var result = await controller.GetProjects(null, null, null, null, null);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var items = Assert.IsAssignableFrom<IEnumerable<ProjectListItemDto>>(ok.Value).ToList();
        var single = Assert.Single(items);
        Assert.Equal("Partner A Project", single.Title);
    }

    [Fact]
    public async Task GetProjects_AppliesFilters_SearchSemesterYearStatus()
    {
        await using var context = CreateContext();
        var org = new Organisation { Id = OrgAId, Name = "Org A", SubmissionStatus = "approved" };
        context.Organisations.Add(org);

        context.Projects.AddRange(
            new Project { Id = Guid.NewGuid(), Title = "Cyber Security Portal", OrganisationId = OrgAId, ProjectType = "capstone", Semester = "S1", Year = 2026, Status = "ongoing" },
            new Project { Id = Guid.NewGuid(), Title = "Mobile App Design", OrganisationId = OrgAId, ProjectType = "capstone", Semester = "S2", Year = 2026, Status = "ongoing" },
            new Project { Id = Guid.NewGuid(), Title = "Legacy Cyber Audit", OrganisationId = OrgAId, ProjectType = "capstone", Semester = "S1", Year = 2025, Status = "completed" }
        );
        await context.SaveChangesAsync();

        var controller = CreateController(context, "admin");
        var result = await controller.GetProjects("Cyber", "ongoing", "S1", 2026, null);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var items = Assert.IsAssignableFrom<IEnumerable<ProjectListItemDto>>(ok.Value).ToList();
        var single = Assert.Single(items);
        Assert.Equal("Cyber Security Portal", single.Title);
    }

    [Fact]
    public async Task GetProject_ReturnsNotFound_WhenDoesNotExistOrSoftDeleted()
    {
        await using var context = CreateContext();
        var org = new Organisation { Id = OrgAId, Name = "Org A", SubmissionStatus = "approved" };
        context.Organisations.Add(org);

        var deletedProject = new Project
        {
            Id = Guid.NewGuid(),
            Title = "Deleted Project",
            OrganisationId = OrgAId,
            ProjectType = "capstone",
            Semester = "S1",
            Year = 2026,
            Status = "cancelled",
            DeletedAt = DateTime.UtcNow
        };
        context.Projects.Add(deletedProject);
        await context.SaveChangesAsync();

        var controller = CreateController(context, "admin");

        var missingResult = await controller.GetProject(Guid.NewGuid());
        Assert.IsType<NotFoundResult>(missingResult.Result);

        var deletedResult = await controller.GetProject(deletedProject.Id);
        Assert.IsType<NotFoundResult>(deletedResult.Result);
    }

    [Fact]
    public async Task CreateProject_ReturnsBadRequest_WhenOrganisationDoesNotExist()
    {
        await using var context = CreateContext();
        var controller = CreateController(context, "admin");

        var request = new SaveProjectRequest(
            Title: "Invalid Org Project",
            Description: null,
            OrganisationId: Guid.NewGuid(),
            FacultyId: null,
            ProjectType: "capstone",
            Semester: "S1",
            Year: 2026,
            Status: "ongoing",
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

        var result = await controller.CreateProject(request);
        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task CreateProject_SavesProject_ReturnsCreatedAtAction()
    {
        await using var context = CreateContext();
        var org = new Organisation { Id = OrgAId, Name = "Org A", SubmissionStatus = "approved" };
        context.Organisations.Add(org);
        await context.SaveChangesAsync();

        var controller = CreateController(context, "admin");

        var request = new SaveProjectRequest(
            Title: "PartnerForge AI Portal",
            Description: "Intelligent matching platform",
            OrganisationId: OrgAId,
            FacultyId: 1,
            ProjectType: "capstone",
            Semester: "S1",
            Year: 2026,
            Status: "ongoing",
            StartDate: null,
            EndDate: null,
            MultipleTeams: true,
            DisciplineArea: "Computer Science",
            SecondaryItDiscipline: "Software Engineering",
            ProjectDeliverables: "Full-stack app and test suite",
            ProjectPartnerAgreement: "Signed",
            StudentProjectAgreement: "Signed",
            IpAssignmentRationale: "Standard QUT IP policy",
            Notes: "High priority");

        var result = await controller.CreateProject(request);

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var savedProject = await context.Projects.SingleAsync(p => p.Title == "PartnerForge AI Portal");
        Assert.Equal(OrgAId, savedProject.OrganisationId);
        Assert.Equal(1, savedProject.FacultyId);
        Assert.True(savedProject.MultipleTeams);
    }

    [Fact]
    public async Task UpdateProject_UpdatesFields_ReturnsNoContent()
    {
        await using var context = CreateContext();
        var org = new Organisation { Id = OrgAId, Name = "Org A", SubmissionStatus = "approved" };
        var project = new Project
        {
            Id = Guid.NewGuid(),
            Title = "Initial Title",
            OrganisationId = OrgAId,
            ProjectType = "capstone",
            Semester = "S1",
            Year = 2026,
            Status = "ongoing"
        };
        context.Organisations.Add(org);
        context.Projects.Add(project);
        await context.SaveChangesAsync();

        var controller = CreateController(context, "admin");

        var updateRequest = new SaveProjectRequest(
            Title: "Updated Capstone Title",
            Description: "Updated desc",
            OrganisationId: OrgAId,
            FacultyId: null,
            ProjectType: "capstone",
            Semester: "S2",
            Year: 2026,
            Status: "completed",
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

        var result = await controller.UpdateProject(project.Id, updateRequest);
        Assert.IsType<NoContentResult>(result);

        var updated = await context.Projects.SingleAsync(p => p.Id == project.Id);
        Assert.Equal("Updated Capstone Title", updated.Title);
        Assert.Equal("S2", updated.Semester);
        Assert.Equal("completed", updated.Status);
    }

    [Fact]
    public async Task DeleteProject_SoftDeletesProject_ReturnsNoContent()
    {
        await using var context = CreateContext();
        var org = new Organisation { Id = OrgAId, Name = "Org A", SubmissionStatus = "approved" };
        var project = new Project
        {
            Id = Guid.NewGuid(),
            Title = "Project To Cancel",
            OrganisationId = OrgAId,
            ProjectType = "capstone",
            Semester = "S1",
            Year = 2026,
            Status = "ongoing"
        };
        context.Organisations.Add(org);
        context.Projects.Add(project);
        await context.SaveChangesAsync();

        var controller = CreateController(context, "admin");

        var result = await controller.DeleteProject(project.Id);
        Assert.IsType<NoContentResult>(result);

        var deleted = await context.Projects.SingleAsync(p => p.Id == project.Id);
        Assert.NotNull(deleted.DeletedAt);
    }

    private static ApplicationDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new ApplicationDbContext(options);
    }

    private static ProjectsController CreateController(
        ApplicationDbContext context,
        string role,
        int? facultyId = null,
        Guid? organisationId = null)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, AdminUserId.ToString()),
            new(ClaimTypes.Role, role)
        };

        if (facultyId.HasValue)
            claims.Add(new Claim("faculty_id", facultyId.Value.ToString()));

        if (organisationId.HasValue)
            claims.Add(new Claim("organisation_id", organisationId.Value.ToString()));

        var httpContext = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"))
        };

        return new ProjectsController(context)
        {
            ControllerContext = new ControllerContext { HttpContext = httpContext }
        };
    }
}
