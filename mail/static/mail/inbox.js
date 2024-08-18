document.addEventListener('DOMContentLoaded', function() {
    // Use buttons to toggle between views
    document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
    document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
    document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
    document.querySelector('#compose').addEventListener('click', () => compose_email());
  
    // By default, load the inbox
    load_mailbox('inbox');
  
    // Form submission handling
    document.querySelector('#compose-form').onsubmit = send_email;
  });
  
  function compose_email(recipients = '', subject = '', body = '', isReply = false) {
    // Show compose view and hide other views
    document.querySelector('#emails-view').style.display = 'none';
    document.querySelector('#compose-view').style.display = 'block';
  
    // Update the "To:" field based on whether it's a reply or a new email
    const composeRecipientsField = document.querySelector('#compose-recipients');
    if (isReply) {
      composeRecipientsField.value = recipients;
    } else {
      composeRecipientsField.placeholder = 'Recipient';
      composeRecipientsField.value = '';
    }
  
    // Clear out composition fields or populate them for replies
    document.querySelector('#compose-subject').value = subject;
    document.querySelector('#compose-body').value = body;
  }
  
  function load_mailbox(mailbox) {
    // Show the mailbox and hide other views
    document.querySelector('#emails-view').style.display = 'block';
    document.querySelector('#compose-view').style.display = 'none';

    // Show the mailbox name
    document.querySelector('#emails-view').innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;

    // Fetch the emails for the specified mailbox
    fetch(`/emails/${mailbox}`)
        .then(response => response.json())
        .then(emails => {
            console.log('Emails:', emails);

            // Check if emails is an array
            if (Array.isArray(emails)) {
                // Clear existing emails but keep the mailbox heading
                const emailsView = document.querySelector('#emails-view');
                emailsView.innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;

                if (emails.length === 0) {
                    emailsView.innerHTML += `<div class="alert alert-info">No messages in ${mailbox}</div>`;
                } else {
                    emails.forEach(email => {
                        const emailDiv = document.createElement('div');
                        emailDiv.className = 'email-row';

                        // Shorten the body if it's too long
                        const preview = email.body.length > 30 ? email.body.substring(0, 30) + '...' : email.body;

                        if (mailbox === 'inbox' || mailbox === 'archive') {
                            // Inbox and Archive styling
                            emailDiv.innerHTML = `
                                <div class="email-content">
                                    <strong>From:</strong> ${email.sender} &nbsp; | &nbsp;
                                    <span class="email-preview">${preview}</span>
                                </div>
                                <span class="timestamp">${email.timestamp}</span>
                                <button class="btn btn-sm btn-outline-primary" onclick="reply_email(${email.id})">Reply</button>
                            `;
                            // Add archive/unarchive button conditionally
                            if (mailbox === 'inbox') {
                                emailDiv.innerHTML += `<button class="btn btn-sm btn-outline-primary" onclick="archive_email(${email.id})">Archive</button>`;
                            } else if (mailbox === 'archive') {
                                emailDiv.innerHTML += `<button class="btn btn-sm btn-outline-primary" onclick="unarchive_email(${email.id})">Unarchive</button>`;
                            }
                        } else if (mailbox === 'sent') {
                            // Sent mailbox styling
                            emailDiv.innerHTML = `
                                <div class="email-content">
                                    <strong>To:</strong> ${email.recipients.join(', ')} &nbsp; | &nbsp;
                                    <span class="email-preview">${preview}</span>
                                </div>
                                <span class="timestamp">${email.timestamp}</span>
                                <button class="btn btn-sm btn-outline-primary" onclick="reply_email(${email.id})">Reply</button>
                            `;
                        }

                        emailDiv.addEventListener('click', () => load_email(email.id, mailbox));
                        emailsView.append(emailDiv);
                    });
                }
            } else {
                console.error('Expected an array but got:', emails);
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

  
  function archive_email(email_id) {
    fetch(`/emails/${email_id}`, {
      method: 'PUT',
      body: JSON.stringify({
        archived: true
      })
    })
    .then(() => load_mailbox('inbox'))
    .catch(error => {
      console.error('Error:', error);
    });
  }
  
  function unarchive_email(email_id) {
    fetch(`/emails/${email_id}`, {
      method: 'PUT',
      body: JSON.stringify({
        archived: false
      })
    })
    .then(() => load_mailbox('archive'))
    .catch(error => {
      console.error('Error:', error);
    });
  }
  
  function send_email(event) {
    event.preventDefault();

    // Clear any previous errors
    const existingError = document.querySelector('.alert-danger');
    if (existingError) {
        existingError.remove();
    }

    // Prepare email data
    const recipients = document.querySelector('#compose-recipients').value;
    const subject = document.querySelector('#compose-subject').value;
    const body = document.querySelector('#compose-body').value;

    // Send the email
    fetch('/emails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            recipients: recipients,
            subject: subject,
            body: body
        })
    })
    .then(response => response.json())
    .then(result => {
        if (result.error) {
            console.error('Error:', result.error);
            display_error(result.error);
        } else {
            // Load the sent mailbox
            load_mailbox('sent');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        display_error('Error sending email. Please try again later.');
    });
}

  
function load_email(email_id, mailbox) {
    // Fetch the email details
    fetch(`/emails/${email_id}`)
      .then(response => response.json())
      .then(email => {
        // Display the email details
        const emailDiv = document.createElement('div');
        emailDiv.innerHTML = `
          <strong>From:</strong> ${email.sender}<br>
          <strong>To:</strong> ${email.recipients.join(', ')}<br>
          <strong>Subject:</strong> ${email.subject}<br>
          <strong>Time:</strong> ${email.timestamp}<br>
          <p>${email.body}</p>
          ${mailbox === 'inbox' ? (email.archived 
            ? `<button class="btn btn-sm btn-outline-primary" onclick="unarchive_email(${email.id})">Unarchive</button>`
            : `<button class="btn btn-sm btn-outline-primary" onclick="archive_email(${email.id})">Archive</button>`) : ''}
          ${mailbox === 'archive' ? `<button class="btn btn-sm btn-outline-primary" onclick="unarchive_email(${email.id})">Unarchive</button>` : ''}
          ${mailbox === 'inbox' || mailbox === 'archive' ? `<button class="btn btn-sm btn-outline-primary" onclick="reply_email(${email.id})" style="margin-left: 10px;">Reply</button>` : ''}
          <button class="btn btn-sm btn-outline-primary" onclick="load_mailbox('${mailbox}')" style="margin-left: 10px;">Back to ${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</button>
        `;
  
        // Replace the emails view with the email details
        document.querySelector('#emails-view').innerHTML = '';
        document.querySelector('#emails-view').append(emailDiv);
      })
      .catch(error => {
        console.error('Error loading email:', error);
      });
  }
  
  function reply_email(email_id) {
    // Fetch the email details to pre-fill the reply form
    fetch(`/emails/${email_id}`)
        .then(response => response.json())
        .then(email => {
            // Create the reply subject
            const subjectPrefix = 'Re: ';
            let replySubject = email.subject;

            // Remove any existing "Re:" prefixes before adding a new one
            replySubject = replySubject.replace(/^(Re: )+/, ''); // Remove existing "Re:" prefixes
            replySubject = subjectPrefix + replySubject; // Add a single "Re:"

            // Create the reply body with only the latest message
            const replyBody = `On ${email.timestamp}, ${email.sender} wrote:\n${email.body}\n\n`;

            // Pre-fill the compose form with the reply details
            compose_email(
                email.sender,  // Set the recipient
                replySubject,  // Set the subject
                replyBody,     // Set the body
                true           // Indicate this is a reply
            );
        })
        .catch(error => {
            console.error('Error fetching email:', error);
        });
}


  function delete_email(email_id) {
    fetch(`/emails/${email_id}`, {
        method: 'DELETE'
    })
    .then(response => {
        if (response.ok) {
            console.log('Email deleted successfully');
            load_mailbox('inbox');  // Redirect to inbox after deletion
        } else {
            console.error('Error deleting email');
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
  }
  