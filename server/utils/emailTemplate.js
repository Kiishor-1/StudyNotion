function emailSkeleton(subject, message, bodyContent) {
  return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>${subject}</title>
    <style>
      body {
        background-color: #f9f9f9;
        font-family: 'Helvetica Neue', Arial, sans-serif;
        font-size: 15px;
        line-height: 1.6;
        color: #444444;
        margin: 0;
        padding: 0;
      }
      .container {
        max-width: 640px;
        margin: 30px auto;
        padding: 25px 30px;
        background: #ffffff;
        border-radius: 12px;
        box-shadow: 0 3px 10px rgba(0,0,0,0.08);
      }
      .logo {
        max-width: 160px;
        margin: 0 auto 25px auto;
        display: block;
      }
      .message {
        font-size: 16pxpx;
        font-weight: 600;
        color: #222222;
        margin-bottom: 18px;
        text-align: left;
      }
      .body {
        font-size: 16px;
        color: #555555;
        margin-bottom: 28px;
        text-align: left;
      }
      .cta-wrapper {
        text-align: center;
        margin: 20px 0;
      }
      .cta {
        display: inline-block;
        padding: 12px 28px;
        background-color: #FFD60A;
        color: #000000;
        text-decoration: none;
        border-radius: 6px;
        font-size: 16px;
        font-weight: bold;
      }
      .support {
        font-size: 13px;
        color: #888888;
        margin-top: 28px;
        text-align: center;
      }
      a {
        color: #0066cc;
        text-decoration: none;
      }
      a:hover {
        text-decoration: underline;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="body">${bodyContent}</div>
      <div class="cta-wrapper">
        <!-- You can inject CTA buttons here -->
      </div>
      <div class="support">
        Need help? Contact us at 
        <a href="mailto:info@studynotion.com">info@studynotion.com</a>
      </div>
    </div>
  </body>
  </html>`;
}

exports.contactUsEmail = (email, firstname, lastname, message, phoneNo, countrycode) => {
  return emailSkeleton(
    "Contact Form Confirmation",
    "Contact Form Confirmation",
    `<p>Dear ${firstname} ${lastname},</p>
     <p>Thank you for contacting us. Here are the details you provided:</p>
     <p>Name: ${firstname} ${lastname}</p>
     <p>Email: ${email}</p>
     <p>Phone Number: ${phoneNo}</p>
     <p>Message: ${message}</p>`
  );
};

exports.courseEnrollmentEmail = (courseName, name) => {
  return emailSkeleton(
    "Course Registration Confirmation",
    "Course Registration Confirmation",
    `<p>Dear ${name},</p>
     <p>You have successfully registered for the course <span class="highlight">"${courseName}"</span>.</p>
     <a class="cta" href="https://study-notion-ten-nu.vercel.app/dashboard">Go to Dashboard</a>`
  );
};

exports.otpTemplate = (otp) => {
  return emailSkeleton(
    "OTP Verification Email",
    "OTP Verification Email",
    `<p>Dear User,</p>
     <p>Please use the following OTP to verify your account:</p>
     <h2 class="highlight">${otp}</h2>
     <p>This OTP is valid for 5 minutes.</p>`
  );
};

exports.passwordUpdated = (email, name) => {
  return emailSkeleton(
    "Password Update Confirmation",
    "Password Update Confirmation",
    `<p>Hey ${name},</p>
     <p>Your password has been successfully updated for <span class="highlight">${email}</span>.</p>`
  );
};

exports.paymentSuccessEmail = (name, amount, orderId, paymentId) => {
  return emailSkeleton(
    "Payment Confirmation",
    "Course Payment Confirmation",
    `<p>Dear ${name},</p>
     <p>We have received a payment of <span class='highlight'>₹${amount}</span>.</p>
     <p>Payment ID: <b>${paymentId}</b></p>
     <p>Order ID: <b>${orderId}</b></p>`
  );
};

exports.sendTicketNotification = (ticket) => {
  return emailSkeleton(
    "New Support Ticket",
    "New Support Ticket Created",
    `<p>A new ticket has been created.</p>
     <p><b>Ticket ID:</b> ${ticket._id}</p>
     <p><b>User Email:</b> ${ticket.email}</p>
     <p><b>Query:</b> ${ticket.query}</p>
     <p><b>Status:</b> ${ticket.status}</p>
     <p><b>Created At:</b> ${ticket.createdAt}</p>`
  );
};

exports.sendTicketAcknowledgement = (ticket) => {
  return emailSkeleton(
    "Support Request Received",
    "Support Request Acknowledgement",
    `<p>Hi,</p>
     <p>We’ve received your support request: "${ticket.query}"</p>
     <p>Our team will get back to you shortly.</p>
     <p>-Support Team</p>`
  );
};
