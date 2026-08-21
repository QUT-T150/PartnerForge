using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using Qut.PartnerForge.Api.Controllers;
using Xunit;

namespace Qut.PartnerForge.Api.Tests;

public class RolePermissionMatrixTests
{
    public static IEnumerable<object[]> EndpointRoleMatrix => new List<object[]>
    {
        // Organisations
        new object[] { typeof(OrganisationsController), nameof(OrganisationsController.GetOrganisations), (object?)null },
        new object[] { typeof(OrganisationsController), nameof(OrganisationsController.GetOrganisation), (object?)null},
        new object[] { typeof(OrganisationsController), nameof(OrganisationsController.CreateOrganisation), "admin,course_organiser" },
        new object[] { typeof(OrganisationsController), nameof(OrganisationsController.UpdateOrganisation), "admin,course_organiser" },
        new object[] { typeof(OrganisationsController), nameof(OrganisationsController.DeleteOrganisation), "admin" },

        // Projects
        new object[] { typeof(ProjectsController), nameof(ProjectsController.GetProjects),(object?)null },
        new object[] { typeof(ProjectsController), nameof(ProjectsController.GetProject), (object?)null },
        new object[] { typeof(ProjectsController), nameof(ProjectsController.CreateProject), "admin,course_organiser" },
        new object[] { typeof(ProjectsController), nameof(ProjectsController.UpdateProject), "admin,course_organiser" },
        new object[] { typeof(ProjectsController), nameof(ProjectsController.DeleteProject), "admin" },

        // ProjectApplications
        new object[] { typeof(ProjectApplicationsController), nameof(ProjectApplicationsController.GetProjectApplications), (object?)null },
        new object[] { typeof(ProjectApplicationsController), nameof(ProjectApplicationsController.GetProjectApplication), (object?)null },
        new object[] { typeof(ProjectApplicationsController), nameof(ProjectApplicationsController.CreateProjectApplication), "admin,course_organiser,industry_partner" },
        new object[] { typeof(ProjectApplicationsController), nameof(ProjectApplicationsController.UpdateProjectApplication), "admin,course_organiser,industry_partner" },
        new object[] { typeof(ProjectApplicationsController), nameof(ProjectApplicationsController.DeleteProjectApplication), "admin,course_organiser" },

        // Events
        new object[] { typeof(EventsController), nameof(EventsController.GetEvents), (object?)null },
        new object[] { typeof(EventsController), nameof(EventsController.GetEvent), (object?)null},
        new object[] { typeof(EventsController), nameof(EventsController.CreateEvent), "admin,course_organiser" },
        new object[] { typeof(EventsController), nameof(EventsController.UpdateEvent), "admin,course_organiser" },
        new object[] { typeof(EventsController), nameof(EventsController.DeleteEvent), "admin" },

        // Users
        new object[] { typeof(UsersController), nameof(UsersController.GetUsers), "admin,industry_team_manager" },
        new object[] { typeof(UsersController), nameof(UsersController.GetUser), "admin,industry_team_manager" },
        new object[] { typeof(UsersController), nameof(UsersController.CreateUser), "admin" },
        new object[] { typeof(UsersController), nameof(UsersController.UpdateUser), "admin" },
        new object[] { typeof(UsersController), nameof(UsersController.DeleteUser), "admin" },

        // AuditLog
        new object[] { typeof(AuditLogController), nameof(AuditLogController.GetAuditLog), "admin,course_organiser" },
        new object[] { typeof(AuditLogController), nameof(AuditLogController.GetTables), "admin,course_organiser" },

        // Auth
        new object[] { typeof(AuthController), nameof(AuthController.Register), "admin" },
    };

        [Theory]
    [MemberData(nameof(EndpointRoleMatrix))]
    public void Endpoint_HasExpectedAuthorizeRoles(Type controllerType, string methodName, string? expectedRoles)
    {
        var method = controllerType.GetMethod(methodName);

        var methodAttr = method!.GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
            .Cast<AuthorizeAttribute>()
            .FirstOrDefault();

        var classAttr = controllerType.GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
            .Cast<AuthorizeAttribute>()
            .FirstOrDefault();

        // Method-level [Authorize] wins when present; otherwise fall back to the class-level one.
        var effectiveRoles = methodAttr?.Roles ?? classAttr?.Roles;

        Assert.Equal(expectedRoles, effectiveRoles);
    }
}