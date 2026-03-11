import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_SMTP_USER,
    pass: process.env.GMAIL_SMTP_PASS
  }
});

type CanvasCredentials = {
  login_id: string;
  password: string;
  course_name: string;
  lms_url?: string;
};

export async function sendStudentWelcomeEmail(to: string, name: string, creds: CanvasCredentials) {
  const lmsUrl = creds.lms_url || process.env.CANVAS_BASE_URL || 'https://ayatech.org';

  const mailOptions = {
    from: `"Ayatech Courses" <${process.env.GMAIL_SMTP_USER}>`,
    to,
    subject: `Welcome to ${creds.course_name} - Login Credentials`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0a192f, #112240); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: #e6f1ff; margin: 0; font-size: 24px;">Welcome to Ayatech!</h1>
          <p style="color: #8892b0; margin-top: 8px; font-size: 14px;">Your learning journey begins now</p>
        </div>
        <div style="background: #ffffff; padding: 32px; border: 1px solid #e2e8f0; border-top: none;">
          <p style="color: #334155; font-size: 16px;">Hi <strong>${name}</strong>,</p>
          <p style="color: #334155; font-size: 14px;">Thank you for enrolling in <strong>${creds.course_name}</strong>. Your Canvas LMS account has been set up and you can start learning right away.</p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 24px 0;">
            <p style="margin: 0 0 4px; font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Your Login Credentials</p>
            <table style="width: 100%; margin-top: 12px; font-size: 14px;">
              <tr><td style="padding: 6px 0; color: #64748b; width: 100px;">Portal</td><td style="padding: 6px 0;"><a href="${lmsUrl}" style="color: #4f46e5; text-decoration: none; font-weight: 600;">${lmsUrl}</a></td></tr>
              <tr><td style="padding: 6px 0; color: #64748b;">Username</td><td style="padding: 6px 0; font-family: monospace; color: #0f172a; font-weight: 600;">${creds.login_id}</td></tr>
              <tr><td style="padding: 6px 0; color: #64748b;">Password</td><td style="padding: 6px 0; font-family: monospace; color: #0f172a; font-weight: 600;">${creds.password}</td></tr>
            </table>
          </div>

          <p style="color: #ef4444; font-size: 13px; font-weight: 500;">⚠️ Please log in and change your password immediately for security.</p>
          
          <a href="${lmsUrl}" style="display: inline-block; margin-top: 16px; padding: 12px 28px; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">Open Learning Portal</a>
        </div>
        <div style="padding: 16px 32px; background: #f8fafc; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none; text-align: center;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Ayatech. All rights reserved.</p>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
}

export async function sendManagerNotification(managerEmail: string, studentName: string, courseName: string) {
  const mailOptions = {
    from: `"Ayatech System" <${process.env.GMAIL_SMTP_USER}>`,
    to: managerEmail,
    subject: `New Enrollment: ${courseName}`,
    html: `
      <h3>New Paid Enrollment Detected</h3>
      <p><strong>Student:</strong> ${studentName}</p>
      <p><strong>Course:</strong> ${courseName}</p>
      <p>They have been automatically provisioned into Canvas LMS.</p>
    `
  };

  await transporter.sendMail(mailOptions);
}

export async function sendMentorNotification(mentorEmail: string, studentName: string) {
  const mailOptions = {
    from: `"Ayatech System" <${process.env.GMAIL_SMTP_USER}>`,
    to: mentorEmail,
    subject: `Success! Lead Converted: ${studentName}`,
    html: `
      <h3>Congratulations!</h3>
      <p>Your lead <strong>${studentName}</strong> has successfully paid and joined their course.</p>
      <p>Your commission will reflect in the dashboard shortly.</p>
    `
  };

  await transporter.sendMail(mailOptions);
}

export async function sendStaffCredentialsEmail(
  to: string,
  name: string,
  password: string,
  role: string,
  referralCode?: string
) {
  const mailOptions = {
    from: `"Ayatech ERP" <${process.env.GMAIL_SMTP_USER}>`,
    to,
    subject: `Your Ayatech Staff Account Has Been Created`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #334155;">
        <div style="background: linear-gradient(135deg, #0a192f, #112240); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: #e6f1ff; margin: 0; font-size: 24px;">Welcome to Ayatech!</h1>
          <p style="color: #8892b0; margin-top: 8px; font-size: 14px;">Your staff account is ready</p>
        </div>
        <div style="background: #ffffff; padding: 32px; border: 1px solid #e2e8f0; border-top: none;">
          <p style="font-size: 16px;">Hi <strong>${name}</strong>,</p>
          <p style="font-size: 14px;">An account has been created for you as a <strong>${role.replace('_', ' ')}</strong> on the Ayatech Enrollment Portal.</p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 24px 0;">
            <p style="margin: 0 0 4px; font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Your Login Credentials</p>
            <table style="width: 100%; margin-top: 12px; font-size: 14px;">
              <tr><td style="padding: 6px 0; color: #64748b; width: 100px;">Portal</td><td style="padding: 6px 0;"><a href="https://erp.ayatech.org" style="color: #4f46e5; text-decoration: none; font-weight: 600;">erp.ayatech.org</a></td></tr>
              <tr><td style="padding: 6px 0; color: #64748b;">Email</td><td style="padding: 6px 0; font-family: monospace; color: #0f172a; font-weight: 600;">${to}</td></tr>
              <tr><td style="padding: 6px 0; color: #64748b;">Password</td><td style="padding: 6px 0; font-family: monospace; color: #0f172a; font-weight: 600;">${password} (Mandatory)</td></tr>
              ${referralCode ? `
              <tr><td style="padding: 6px 0; color: #64748b;">Referral Code</td><td style="padding: 6px 0; font-family: monospace; color: #7c3aed; font-weight: 700; font-size: 18px;">${referralCode}</td></tr>
              ` : ''}
            </table>
          </div>

          ${referralCode ? `
          <div style="background: #fdf2f8; padding: 16px; border-radius: 8px; border: 1px solid #fbcfe8; margin-bottom: 24px;">
            <p style="margin: 0; color: #9d174d; font-size: 13px;">
              <strong>Note:</strong> Share your Referral Code with students. When they use it to enroll, your commission will be automatically tracked in your dashboard.
            </p>
          </div>
          ` : ''}

          <p style="color: #ef4444; font-size: 13px; font-weight: 500;">⚠️ Please logging in and change your password immediately for security.</p>
          
          <a href="https://erp.ayatech.org" style="display: inline-block; margin-top: 16px; padding: 12px 28px; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">Login to Portal</a>
        </div>
        <div style="padding: 16px 32px; background: #f8fafc; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none; text-align: center;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Ayatech. All rights reserved.</p>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
}

export async function sendStaffApprovalEmail(
  to: string,
  name: string,
  role: string,
  password?: string,
  referralCode?: string
) {
  const mailOptions = {
    from: `"Ayatech ERP" <${process.env.GMAIL_SMTP_USER}>`,
    to,
    subject: `Your Role Has Been Assigned - Ayatech ERP`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #334155;">
        <div style="background: linear-gradient(135deg, #0a192f, #112240); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: #e6f1ff; margin: 0; font-size: 24px;">Welcome Aboard!</h1>
          <p style="color: #8892b0; margin-top: 8px; font-size: 14px;">Your access has been approved</p>
        </div>
        <div style="background: #ffffff; padding: 32px; border: 1px solid #e2e8f0; border-top: none;">
          <p style="font-size: 16px;">Hi <strong>${name}</strong>,</p>
          <p style="font-size: 14px;">Your registration has been approved and you have been assigned the role of <strong>${role.replace('_', ' ')}</strong> on the Ayatech ERP portal.</p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 24px 0;">
            <p style="margin: 0 0 4px; font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Access Details</p>
            <table style="width: 100%; margin-top: 12px; font-size: 14px;">
              <tr><td style="padding: 6px 0; color: #64748b; width: 100px;">Portal</td><td style="padding: 6px 0;"><a href="https://erp.ayatech.org" style="color: #4f46e5; text-decoration: none; font-weight: 600;">erp.ayatech.org</a></td></tr>
              <tr><td style="padding: 6px 0; color: #64748b;">Email</td><td style="padding: 6px 0; font-family: monospace; color: #0f172a; font-weight: 600;">${to}</td></tr>
              <tr><td style="padding: 6px 0; color: #64748b;">Password</td><td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${password || 'Use the password you registered with (Mandatory)'}</td></tr>
              ${referralCode ? `
              <tr><td style="padding: 6px 0; color: #64748b;">Referral Code</td><td style="padding: 6px 0; font-family: monospace; color: #7c3aed; font-weight: 700; font-size: 18px;">${referralCode}</td></tr>
              ` : ''}
            </table>
          </div>

          ${referralCode ? `
          <div style="background: #fdf2f8; padding: 16px; border-radius: 8px; border: 1px solid #fbcfe8; margin-bottom: 24px;">
            <p style="margin: 0; color: #9d174d; font-size: 13px;">
              <strong>Note:</strong> Use your Referral Code when students enroll to track your commissions in the dashboard.
            </p>
          </div>
          ` : ''}
          
          <a href="https://erp.ayatech.org" style="display: inline-block; margin-top: 16px; padding: 12px 28px; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">Login to ERP</a>
        </div>
        <div style="padding: 16px 32px; background: #f8fafc; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none; text-align: center;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Ayatech. All rights reserved.</p>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
}

export async function sendClassReminder(
  mentorEmail: string,
  mentorName: string,
  courseName: string,
  classTime: string
) {
  const mailOptions = {
    from: `"Ayatech System" <${process.env.GMAIL_SMTP_USER}>`,
    to: mentorEmail,
    subject: `Reminder: ${courseName} class starts in 30 minutes`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0a192f, #112240); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: #e6f1ff; margin: 0; font-size: 24px;">⏰ Class Reminder</h1>
          <p style="color: #8892b0; margin-top: 8px; font-size: 14px;">Your class starts in 30 minutes</p>
        </div>
        <div style="background: #ffffff; padding: 32px; border: 1px solid #e2e8f0; border-top: none;">
          <p style="color: #334155; font-size: 16px;">Hi <strong>${mentorName}</strong>,</p>
          <p style="color: #334155; font-size: 14px;">This is a friendly reminder that your <strong>${courseName}</strong> class is scheduled to begin at <strong>${classTime}</strong> today.</p>
          
          <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; border: 1px solid #bbf7d0; margin: 24px 0; text-align: center;">
            <p style="margin: 0; font-size: 13px; color: #166534; font-weight: 600;">CLASS TIME</p>
            <p style="margin: 4px 0 0; font-size: 28px; font-weight: 700; color: #15803d;">${classTime}</p>
          </div>

          <p style="color: #64748b; font-size: 13px;">Please ensure you are prepared and ready to start on time. Good luck! 🎓</p>
        </div>
        <div style="padding: 16px 32px; background: #f8fafc; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none; text-align: center;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Ayatech. All rights reserved.</p>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
}
