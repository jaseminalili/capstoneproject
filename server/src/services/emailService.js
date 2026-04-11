const nodemailer = require('nodemailer')
const config     = require('../config')
const logger     = require('../utils/logger')

// ── Transporter ───────────────────────────────────────────────────────────────
let transporter

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host:   config.email.host,
      port:   config.email.port,
      secure: config.email.secure,
      auth:   { user: config.email.user, pass: config.email.pass },
    })
    transporter.verify()
      .then(() => logger.info('✅  Email service ready'))
      .catch(e => logger.warn('⚠️  Email service unavailable:', e.message))
  }
  return transporter
}

// ── Template helpers ──────────────────────────────────────────────────────────
const fmt = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const statusStyle = s => ({
  active:    { bg: '#D1FAE5', text: '#065F46' },
  planning:  { bg: '#DBEAFE', text: '#1E40AF' },
  completed: { bg: '#E5E7EB', text: '#374151' },
  on_hold:   { bg: '#FEF3C7', text: '#92400E' },
  cancelled: { bg: '#FEE2E2', text: '#991B1B' },
}[s] || { bg: '#F3F4F6', text: '#374151' })

const priorityColor = p => ({
  critical: '#DC2626', high: '#EA580C', medium: '#D97706', low: '#16A34A'
}[p] || '#6B7280')

// ── Base layout wrapper ───────────────────────────────────────────────────────
const layout = (title, content) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:48px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

<!-- Header -->
<tr><td style="background:linear-gradient(135deg,#1E3A8A 0%,#2563EB 50%,#3B82F6 100%);border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;">
  <table width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center">
    <div style="background:rgba(255,255,255,.15);border-radius:14px;width:52px;height:52px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
      <span style="color:#fff;font-size:26px;font-weight:900;line-height:1;">T</span>
    </div>
    <div style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-.5px;margin-bottom:2px;">TaskFlow</div>
    <div style="color:rgba(255,255,255,.7);font-size:12px;letter-spacing:.08em;text-transform:uppercase;">Project Management Platform</div>
  </td></tr>
  </table>
</td></tr>

<!-- Body -->
<tr><td style="background:#fff;padding:40px;">${content}</td></tr>

<!-- Footer -->
<tr><td style="background:#F8FAFC;border-top:1px solid #E2E8F0;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;">
  <p style="margin:0;font-size:12px;color:#94A3B8;">© ${new Date().getFullYear()} TaskFlow. All rights reserved.</p>
  <p style="margin:6px 0 0;font-size:11px;color:#CBD5E1;">This email was sent automatically. Please do not reply.</p>
</td></tr>

</table>
</td></tr></table>
</body></html>`

// ── Workspace Invitation Email ────────────────────────────────────────────────
function buildWorkspaceInviteEmail({ inviteeName, inviterName, workspaceName, role, projects, acceptUrl }) {
  const roleColor = role === 'admin' ? '#7C3AED' : '#2563EB'
  const roleBg    = role === 'admin' ? '#EDE9FE' : '#EFF6FF'
  const roleLabel = role === 'admin' ? 'Administrator' : 'Team Member'

  const projectRows = projects.length
    ? projects.map(p => {
        const ss = statusStyle(p.status)
        return `<tr>
          <td style="padding:12px 16px;border-bottom:1px solid #F1F5F9;font-size:13px;font-weight:600;color:#1E293B;">${p.name}</td>
          <td style="padding:12px 16px;border-bottom:1px solid #F1F5F9;">
            <span style="background:${ss.bg};color:${ss.text};font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:.05em;">${(p.status||'').replace('_',' ')}</span>
          </td>
          <td style="padding:12px 16px;border-bottom:1px solid #F1F5F9;font-size:12px;font-weight:700;color:${priorityColor(p.priority)};text-transform:uppercase;">${p.priority}</td>
          <td style="padding:12px 16px;border-bottom:1px solid #F1F5F9;font-size:12px;color:#64748B;">${fmt(p.end_date)}</td>
        </tr>`
      }).join('')
    : `<tr><td colspan="4" style="padding:20px;text-align:center;color:#94A3B8;font-size:13px;font-style:italic;">No active projects yet</td></tr>`

  const content = `
    <h2 style="font-size:24px;font-weight:800;color:#0F172A;margin:0 0 8px;letter-spacing:-.5px;">You've Been Invited! 🎉</h2>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 24px;">
      Hi${inviteeName ? ` <strong style="color:#0F172A;">${inviteeName}</strong>` : ''},
    </p>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 24px;">
      <strong style="color:#0F172A;">${inviterName}</strong> has invited you to join
      <strong style="color:#0F172A;">${workspaceName}</strong> on TaskFlow as a:
    </p>

    <!-- Role Badge -->
    <div style="text-align:center;margin:0 0 28px;">
      <span style="background:${roleColor};color:#fff;font-size:14px;font-weight:700;padding:10px 30px;border-radius:30px;letter-spacing:.06em;text-transform:uppercase;display:inline-block;">${roleLabel}</span>
    </div>

    <!-- Role description -->
    <div style="background:${roleBg};border-radius:12px;padding:16px 20px;margin:0 0 28px;">
      ${role === 'admin'
        ? `<p style="margin:0;font-size:13px;color:#5B21B6;font-weight:500;line-height:1.6;">⚡ <strong>Administrators</strong> have full access to manage projects, invite team members, configure workspace settings, and assign tasks to anyone in the workspace.</p>`
        : `<p style="margin:0;font-size:13px;color:#1E40AF;font-weight:500;line-height:1.6;">👥 <strong>Team Members</strong> can view and contribute to assigned projects, create and manage tasks, post comments, and collaborate with the team.</p>`
      }
    </div>

    <hr style="border:none;border-top:1px solid #E2E8F0;margin:0 0 28px;"/>

    <!-- Projects Table -->
    <h3 style="font-size:15px;font-weight:700;color:#0F172A;margin:0 0 6px;">📋 Workspace Projects</h3>
    <p style="font-size:13px;color:#64748B;margin:0 0 16px;">Here's what the team is currently working on:</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;">
      <thead>
        <tr style="background:#F8FAFC;">
          <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #E2E8F0;">Project</th>
          <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #E2E8F0;">Status</th>
          <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #E2E8F0;">Priority</th>
          <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #E2E8F0;">Due Date</th>
        </tr>
      </thead>
      <tbody>${projectRows}</tbody>
    </table>

    <!-- CTA -->
    <div style="text-align:center;margin:36px 0 28px;">
      <a href="${acceptUrl}"
        style="background:linear-gradient(135deg,#1D4ED8,#3B82F6);color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:16px 44px;border-radius:12px;display:inline-block;letter-spacing:.02em;box-shadow:0 4px 14px rgba(59,130,246,.35);">
        Accept Invitation →
      </a>
      <p style="margin:14px 0 0;font-size:12px;color:#94A3B8;">This invitation expires in 7 days</p>
    </div>

    <div style="background:#F8FAFC;border-radius:10px;padding:14px 18px;margin:0 0 20px;">
      <p style="margin:0;font-size:12px;color:#64748B;">Or copy this link into your browser:</p>
      <p style="margin:5px 0 0;font-size:12px;color:#2563EB;word-break:break-all;">${acceptUrl}</p>
    </div>
    <p style="font-size:12px;color:#94A3B8;margin:0;line-height:1.6;">
      If you were not expecting this invitation, you can safely ignore this email.
      You will not be added until you click "Accept Invitation".
    </p>`

  return layout(`You're invited to join ${workspaceName}`, content)
}

// ── Task Assignment Email ─────────────────────────────────────────────────────
function buildTaskAssignmentEmail({ assigneeName, assignerName, taskTitle, taskDescription, taskPriority, taskType, taskStatus, dueDate, projectName, projectStatus, projectPriority, projectProgress, taskUrl }) {
  const pc = priorityColor(taskPriority)

  const content = `
    <h2 style="font-size:22px;font-weight:800;color:#0F172A;margin:0 0 8px;">📋 New Task Assigned</h2>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 20px;">
      Hi <strong style="color:#0F172A;">${assigneeName}</strong>,
    </p>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 24px;">
      <strong style="color:#0F172A;">${assignerName}</strong> has assigned you a new task in the
      <strong style="color:#0F172A;">${projectName}</strong> project.
    </p>

    <!-- Task Card -->
    <div style="border:2px solid #E2E8F0;border-radius:14px;overflow:hidden;margin:0 0 24px;">
      <div style="background:#F8FAFC;padding:16px 20px;border-bottom:1px solid #E2E8F0;">
        <h3 style="font-size:18px;font-weight:700;color:#0F172A;margin:0;">${taskTitle}</h3>
      </div>
      <div style="padding:20px;">
        ${taskDescription ? `<p style="font-size:14px;color:#475569;line-height:1.65;margin:0 0 16px;">${taskDescription}</p>` : ''}
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin:0 0 16px;">
          <span style="background:${pc}22;color:${pc};font-size:11px;font-weight:700;padding:4px 12px;border-radius:20px;text-transform:uppercase;letter-spacing:.05em;border:1px solid ${pc}44;">${taskPriority} Priority</span>
          <span style="background:#EDE9FE;color:#5B21B6;font-size:11px;font-weight:700;padding:4px 12px;border-radius:20px;text-transform:uppercase;letter-spacing:.05em;">${taskType}</span>
          <span style="background:#DBEAFE;color:#1E40AF;font-size:11px;font-weight:700;padding:4px 12px;border-radius:20px;text-transform:uppercase;letter-spacing:.05em;">${(taskStatus||'').replace('_',' ')}</span>
        </div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="50%" style="padding:0 8px 0 0;vertical-align:top;">
              <div style="background:#F8FAFC;border-radius:10px;padding:12px 14px;">
                <div style="font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px;">Due Date</div>
                <div style="font-size:15px;font-weight:700;color:#0F172A;">${fmt(dueDate)}</div>
              </div>
            </td>
            <td width="50%" style="padding:0 0 0 8px;vertical-align:top;">
              <div style="background:#F8FAFC;border-radius:10px;padding:12px 14px;">
                <div style="font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px;">Project</div>
                <div style="font-size:15px;font-weight:700;color:#0F172A;">${projectName}</div>
              </div>
            </td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Project Progress -->
    <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;padding:16px 20px;margin:0 0 28px;">
      <h4 style="font-size:12px;font-weight:700;color:#1E40AF;text-transform:uppercase;letter-spacing:.08em;margin:0 0 12px;">Project Overview</h4>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:13px;color:#334155;padding-bottom:6px;">Status: <strong style="text-transform:uppercase;">${(projectStatus||'').replace('_',' ')}</strong></td>
          <td style="font-size:13px;color:#334155;padding-bottom:6px;">Priority: <strong style="color:${priorityColor(projectPriority)};text-transform:uppercase;">${projectPriority}</strong></td>
          <td style="font-size:13px;color:#334155;padding-bottom:6px;">Progress: <strong>${projectProgress}%</strong></td>
        </tr>
      </table>
      <div style="background:#BFDBFE;border-radius:4px;height:6px;margin-top:4px;overflow:hidden;">
        <div style="background:#2563EB;height:6px;border-radius:4px;width:${projectProgress}%;"></div>
      </div>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin:0 0 20px;">
      <a href="${taskUrl}"
        style="background:linear-gradient(135deg,#7C3AED,#A78BFA);color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:12px;display:inline-block;box-shadow:0 4px 14px rgba(124,58,237,.3);">
        View Task →
      </a>
    </div>
    <p style="font-size:12px;color:#94A3B8;margin:0;text-align:center;line-height:1.6;">
      You're receiving this because you were assigned to this task.
    </p>`

  return layout(`New task assigned: ${taskTitle}`, content)
}

// ── Public send functions ─────────────────────────────────────────────────────
async function sendWorkspaceInvitation(options) {
  const { to, workspaceName, token, frontendUrl } = options
  const baseUrl   = frontendUrl || config.frontendUrl
  const acceptUrl = `${baseUrl}/invite/accept?token=${token}`
  const html = buildWorkspaceInviteEmail({ ...options, acceptUrl })

  try {
    const info = await getTransporter().sendMail({
      from:    `"${config.email.fromName}" <${config.email.fromAddress}>`,
      to,
      subject: `You've been invited to join ${workspaceName} on TaskFlow`,
      html,
      text:    `You've been invited to join ${workspaceName}. Accept: ${acceptUrl} (expires in 7 days)`,
    })
    logger.info(`📧  Invitation sent → ${to} (${info.messageId})`)
    return { success: true, messageId: info.messageId }
  } catch (err) {
    logger.warn(`📧  Failed to send invitation to ${to}:`, err.message)
    return { success: false, error: err.message }
  }
}

async function sendTaskAssignment(options) {
  const { to, taskTitle, taskId, projectId, frontendUrl } = options
  const baseUrl = frontendUrl || config.frontendUrl
  const taskUrl = `${baseUrl}/task/${taskId}?projectId=${projectId}`
  const html = buildTaskAssignmentEmail({ ...options, taskUrl })

  try {
    const info = await getTransporter().sendMail({
      from:    `"${config.email.fromName}" <${config.email.fromAddress}>`,
      to,
      subject: `📋 New task assigned: ${taskTitle}`,
      html,
      text:    `${options.assignerName} assigned you "${taskTitle}" in ${options.projectName}. Due: ${fmt(options.dueDate)}. View: ${taskUrl}`,
    })
    logger.info(`📧  Task assignment sent → ${to}`)
    return { success: true, messageId: info.messageId }
  } catch (err) {
    logger.warn(`📧  Failed to send task assignment to ${to}:`, err.message)
    return { success: false, error: err.message }
  }
}

module.exports = { sendWorkspaceInvitation, sendTaskAssignment }
