using Qut.PartnerForge.Api.Data;
using Qut.PartnerForge.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Qut.PartnerForge.Api.Controllers;

/// <summary>
/// Read-only browser over the append-only <c>audit_log</c> table. Admin-only: audit rows expose
/// row snapshots across every entity, so access mirrors the widest read scope in the system.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "admin,course_organiser")]

public class AuditLogController : ControllerBase
{
    private const int MaxPageSize = 1000;

    private readonly ApplicationDbContext _context;

    /// <summary>
    /// Initializes a new instance of <see cref="AuditLogController"/>.
    /// </summary>
    /// <param name="context">Database context.</param>
    public AuditLogController(ApplicationDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Lists audit events, newest first, with optional filters and server-side paging.
    /// </summary>
    /// <param name="action">Optional action filter (<c>INSERT</c>, <c>UPDATE</c>, <c>DELETE</c>, <c>SOFT_DELETE</c>, <c>RESTORE</c>).</param>
    /// <param name="tableName">Optional table filter.</param>
    /// <param name="changedBy">Optional acting-user filter.</param>
    /// <param name="from">Optional inclusive lower bound on <c>changed_at</c> (UTC).</param>
    /// <param name="to">Optional inclusive upper bound on <c>changed_at</c> (UTC).</param>
    /// <param name="page">1-based page number.</param>
    /// <param name="pageSize">Rows per page, capped at 1000 (the CSV export uses the cap).</param>
    [HttpGet]
    public async Task<ActionResult<AuditLogPageDto>> GetAuditLog(
        [FromQuery] string? action,
        [FromQuery] string? tableName,
        [FromQuery] Guid? recordId,
        [FromQuery] Guid? changedBy,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25)
    {
        var isAdmin = User.IsInRole("admin");
if (!isAdmin && !recordId.HasValue)
{
    return Forbid();
}
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, MaxPageSize);

        var query = _context.AuditLog.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(action))
            query = query.Where(a => a.Action == action);

        if (!string.IsNullOrWhiteSpace(tableName))
            query = query.Where(a => a.TableName == tableName);
          if (recordId.HasValue)
              query = query.Where(a => a.RecordId == recordId.Value);
        if (changedBy.HasValue)
            query = query.Where(a => a.ChangedBy == changedBy.Value);

        if (from.HasValue)
            query = query.Where(a => a.ChangedAt >= from.Value);

        if (to.HasValue)
            query = query.Where(a => a.ChangedAt <= to.Value);

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(a => a.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new AuditLogEntryDto(
                a.Id,
                a.TableName,
                a.RecordId,
                a.Action,
                a.ChangedBy,
                _context.Users
                    .Where(u => u.Id == a.ChangedBy)
                    .Select(u => u.FullName)
                    .FirstOrDefault(),
                _context.Users
                    .Where(u => u.Id == a.ChangedBy)
                    .Select(u => u.Email)
                    .FirstOrDefault(),
                a.ChangedAt,
                a.OldValues,
                a.NewValues,
                a.IpAddress,
                a.UserAgent
            ))
            .ToListAsync();

        return Ok(new AuditLogPageDto(items, totalCount, page, pageSize));
    }

    /// <summary>
    /// Lists the distinct table names present in the audit log, for filter dropdowns.
    /// </summary>
    [HttpGet("tables")]
    public async Task<ActionResult<IEnumerable<string>>> GetTables()
    {
        var tables = await _context.AuditLog
            .AsNoTracking()
            .Select(a => a.TableName)
            .Distinct()
            .OrderBy(t => t)
            .ToListAsync();

        return Ok(tables);
    }
}
