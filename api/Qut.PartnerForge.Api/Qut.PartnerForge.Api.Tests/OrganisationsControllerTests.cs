using System.Net;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Qut.PartnerForge.Api.Controllers;
using Qut.PartnerForge.Api.Data;
using Qut.PartnerForge.Api.Models;

namespace Qut.PartnerForge.Api.Tests;

public class OrganisationsControllerTests
{
    private static readonly Guid AdminUserId = Guid.NewGuid();
    private static readonly Guid PartnerOrgId = Guid.NewGuid();
    private static readonly Guid PartnerUserId = Guid.NewGuid();

    [Fact]
    public async Task GetIndustries_ReturnsAllIndustriesOrderedByName()
    {
        await using var context = CreateContext();
        context.Industries.AddRange(
            new Industry { Id = 1, Name = "Software" },
            new Industry { Id = 2, Name = "Healthcare" },
            new Industry { Id = 3, Name = "Aerospace" }
        );
        await context.SaveChangesAsync();

        var controller = CreateController(context, "admin");
        var result = await controller.GetIndustries();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var list = Assert.IsAssignableFrom<IEnumerable<object>>(ok.Value);
        Assert.Equal(3, list.Count());
    }

    [Fact]
    public async Task GetOrganisations_Admin_ReturnsAllOrganisations()
    {
        await using var context = CreateContext();
        context.Organisations.AddRange(
            new Organisation { Id = Guid.NewGuid(), Name = "Org A", SubmissionStatus = "approved" },
            new Organisation { Id = Guid.NewGuid(), Name = "Org B", SubmissionStatus = "pending" }
        );
        await context.SaveChangesAsync();

        var controller = CreateController(context, "admin");
        var result = await controller.GetOrganisations(null, null, null);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var items = Assert.IsAssignableFrom<IEnumerable<OrganisationListItemDto>>(ok.Value);
        Assert.Equal(2, items.Count());
    }

    [Fact]
    public async Task GetOrganisations_CourseOrganiser_ReturnsOnlyApprovedOrganisations()
    {
        await using var context = CreateContext();
        context.Organisations.AddRange(
            new Organisation { Id = Guid.NewGuid(), Name = "Org Approved", SubmissionStatus = "approved" },
            new Organisation { Id = Guid.NewGuid(), Name = "Org Pending", SubmissionStatus = "pending" }
        );
        await context.SaveChangesAsync();

        var controller = CreateController(context, "course_organiser");
        var result = await controller.GetOrganisations(null, null, null);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var items = Assert.IsAssignableFrom<IEnumerable<OrganisationListItemDto>>(ok.Value).ToList();
        var single = Assert.Single(items);
        Assert.Equal("Org Approved", single.Name);
    }

    [Fact]
    public async Task GetOrganisations_IndustryPartner_ReturnsOnlyOwnOrganisation()
    {
        await using var context = CreateContext();
        var ownOrg = new Organisation { Id = PartnerOrgId, Name = "My Partner Org", SubmissionStatus = "approved" };
        var otherOrg = new Organisation { Id = Guid.NewGuid(), Name = "Other Org", SubmissionStatus = "approved" };
        context.Organisations.AddRange(ownOrg, otherOrg);
        await context.SaveChangesAsync();

        var controller = CreateController(context, "industry_partner", organisationId: PartnerOrgId);
        var result = await controller.GetOrganisations(null, null, null);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var items = Assert.IsAssignableFrom<IEnumerable<OrganisationListItemDto>>(ok.Value).ToList();
        var single = Assert.Single(items);
        Assert.Equal("My Partner Org", single.Name);
    }

    [Fact]
    public async Task GetOrganisations_AppliesSearchAndStatusFilters()
    {
        await using var context = CreateContext();
        context.Organisations.AddRange(
            new Organisation { Id = Guid.NewGuid(), Name = "Acme Robotics", PartnershipStatus = "active", SubmissionStatus = "approved" },
            new Organisation { Id = Guid.NewGuid(), Name = "Acme Health", PartnershipStatus = "prospect", SubmissionStatus = "approved" },
            new Organisation { Id = Guid.NewGuid(), Name = "Beta Solutions", PartnershipStatus = "active", SubmissionStatus = "approved" }
        );
        await context.SaveChangesAsync();

        var controller = CreateController(context, "admin");
        var result = await controller.GetOrganisations("Acme", "active", null);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var items = Assert.IsAssignableFrom<IEnumerable<OrganisationListItemDto>>(ok.Value).ToList();
        var single = Assert.Single(items);
        Assert.Equal("Acme Robotics", single.Name);
    }

    [Fact]
    public async Task GetOrganisation_ReturnsNotFound_WhenNonExistentOrSoftDeleted()
    {
        await using var context = CreateContext();
        var deletedOrg = new Organisation
        {
            Id = Guid.NewGuid(),
            Name = "Dead Org",
            DeletedAt = DateTime.UtcNow,
            SubmissionStatus = "approved"
        };
        context.Organisations.Add(deletedOrg);
        await context.SaveChangesAsync();

        var controller = CreateController(context, "admin");

        var missingResult = await controller.GetOrganisation(Guid.NewGuid());
        Assert.IsType<NotFoundResult>(missingResult.Result);

        var deletedResult = await controller.GetOrganisation(deletedOrg.Id);
        Assert.IsType<NotFoundResult>(deletedResult.Result);
    }

    [Fact]
    public async Task CreateOrganisation_SavesOrgAndPrimaryContact_ReturnsCreatedAtAction()
    {
        await using var context = CreateContext();
        var controller = CreateController(context, "admin");

        var request = new SaveOrganisationRequest(
            RegistrationId: "REG-2026-001",
            Name: "Novel AI Pty Ltd",
            Abn: "12345678901",
            IndustryId: null,
            Email: "contact@novelai.com",
            Website: "https://novelai.com",
            Phone: "0712345678",
            AddressLine1: "10 Innovation Way",
            AddressLine2: null,
            City: "Brisbane",
            State: "QLD",
            Postcode: "4000",
            Country: "Australia",
            OrganisationInformation: "Cutting edge AI lab",
            PrimaryContactName: "Alice Smith",
            PrimaryContactPosition: "CTO",
            PrimaryContactEmail: "alice@novelai.com",
            PrimaryContactPhone: "0400111222",
            PartnershipStatus: "active",
            Notes: "High potential");

        var actionResult = await controller.CreateOrganisation(request);

        var created = Assert.IsType<CreatedAtActionResult>(actionResult.Result);
        var savedOrg = await context.Organisations.SingleAsync(o => o.Name == "Novel AI Pty Ltd");
        Assert.Equal("REG-2026-001", savedOrg.RegistrationId);
        Assert.Equal("approved", savedOrg.SubmissionStatus);

        var primaryContact = await context.Contacts.SingleAsync(c => c.OrganisationId == savedOrg.Id);
        Assert.Equal("Alice", primaryContact.FirstName);
        Assert.Equal("Smith", primaryContact.LastName);
        Assert.Equal("CTO", primaryContact.JobTitle);
        Assert.True(primaryContact.IsPrimary);
    }

    [Fact]
    public async Task UpdateOrganisation_UpdatesPropertiesAndContact_ReturnsNoContent()
    {
        await using var context = CreateContext();
        var org = new Organisation
        {
            Id = Guid.NewGuid(),
            Name = "Original Org",
            PartnershipStatus = "prospect",
            SubmissionStatus = "approved"
        };
        context.Organisations.Add(org);
        await context.SaveChangesAsync();

        var controller = CreateController(context, "admin");

        var updateRequest = new SaveOrganisationRequest(
            RegistrationId: "REG-UPDATED",
            Name: "Updated Org Name",
            Abn: null,
            IndustryId: null,
            Email: "new@org.com",
            Website: null,
            Phone: null,
            AddressLine1: null,
            AddressLine2: null,
            City: null,
            State: null,
            Postcode: null,
            Country: null,
            OrganisationInformation: null,
            PrimaryContactName: "Bob Builder",
            PrimaryContactPosition: "Manager",
            PrimaryContactEmail: "bob@org.com",
            PrimaryContactPhone: null,
            PartnershipStatus: "active",
            Notes: null);

        var result = await controller.UpdateOrganisation(org.Id, updateRequest);
        Assert.IsType<NoContentResult>(result);

        var updatedOrg = await context.Organisations.SingleAsync(o => o.Id == org.Id);
        Assert.Equal("Updated Org Name", updatedOrg.Name);
        Assert.Equal("active", updatedOrg.PartnershipStatus);

        var contact = await context.Contacts.SingleAsync(c => c.OrganisationId == org.Id);
        Assert.Equal("Bob", contact.FirstName);
        Assert.Equal("Builder", contact.LastName);
    }

    [Fact]
    public async Task DeleteOrganisation_SoftDeletesOrganisation_ReturnsNoContent()
    {
        await using var context = CreateContext();
        var org = new Organisation
        {
            Id = Guid.NewGuid(),
            Name = "To Be Deleted",
            SubmissionStatus = "approved"
        };
        context.Organisations.Add(org);
        await context.SaveChangesAsync();

        var controller = CreateController(context, "admin");

        var result = await controller.DeleteOrganisation(org.Id);
        Assert.IsType<NoContentResult>(result);

        var deletedOrg = await context.Organisations.SingleAsync(o => o.Id == org.Id);
        Assert.NotNull(deletedOrg.DeletedAt);
    }

    private static ApplicationDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new ApplicationDbContext(options);
    }

    private static OrganisationsController CreateController(
        ApplicationDbContext context,
        string role,
        Guid? organisationId = null)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, AdminUserId.ToString()),
            new(ClaimTypes.Role, role)
        };

        if (organisationId.HasValue)
        {
            claims.Add(new Claim("organisation_id", organisationId.Value.ToString()));
        }

        var httpContext = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"))
        };

        return new OrganisationsController(context)
        {
            ControllerContext = new ControllerContext { HttpContext = httpContext }
        };
    }
}
