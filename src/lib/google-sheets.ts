import { google } from 'googleapis'

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file'
]

function getAuth() {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  
  return new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    undefined,
    privateKey,
    SCOPES
  )
}

/**
 * Creates a new Google Spreadsheet and shares it with the lecturer
 */
export async function createGradingSheet(
  lecturerEmail: string,
  lecturerName: string,
  students: any[]
) {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })
  const drive = google.drive({ version: 'v3', auth })

  // 1. Create Spreadsheet
  const spreadsheet = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: `[Academic Nexus] Grading - ${lecturerName} - ${new Date().toLocaleDateString()}`,
      },
      sheets: [
        {
          properties: {
            title: 'Grading Worksheet',
            gridProperties: {
              frozenRowCount: 1,
            }
          }
        }
      ]
    }
  })

  const spreadsheetId = spreadsheet.data.spreadsheetId!
  const spreadsheetUrl = spreadsheet.data.spreadsheetUrl!

  // 2. Share with Lecturer
  await drive.permissions.create({
    fileId: spreadsheetId,
    requestBody: {
      type: 'user',
      role: 'writer',
      emailAddress: lecturerEmail,
    }
  })

  // 3. Prepare Header and Data
  const headers = [
    'Student ID', 'Student Code', 'Student Name', 
    'Slide', 'Presentation', 'Timing', 'Content', 
    'Q&A', 'Innovation', 'Bonus', 'Total', 'Feedback'
  ]

  const rows = [
    headers,
    ...students.map(s => [
      `${s.submission_id}:${s.registration_id}`, // Hidden Reference in Column A
      s.student_code,
      s.student_name,
      '', '', '', '', '', '', '', 
      `=SUM(D${students.indexOf(s) + 2}:J${students.indexOf(s) + 2})`, // Simple Formula
      ''
    ])
  ]

  // 4. Populate Data
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'Grading Worksheet!A1',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: rows
    }
  })

  // 5. Apply basic formatting
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          // Make header bold
          repeatCell: {
            range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
            cell: {
              userEnteredFormat: {
                textFormat: { bold: true },
                backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 }
              }
            },
            fields: 'userEnteredFormat(textFormat,backgroundColor)'
          }
        },
        {
          // Auto-resize columns
          autoResizeDimensions: {
            dimensions: { sheetId: 0, dimension: 'COLUMNS', startIndex: 0, endIndex: 12 }
          }
        }
      ]
    }
  })

  return { spreadsheetId, spreadsheetUrl }
}

/**
 * Reads grading data from a Google Spreadsheet
 */
export async function readGradingSheet(spreadsheetId: string) {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Grading Worksheet!A2:L100', // Assuming max 100 students per sync
  })

  const rows = response.data.values || []
  
  // Convert rows back to objects matching the CSV schema
  return rows.map(row => ({
    'Student ID': row[0],
    'Student Code': row[1],
    'Student Name': row[2],
    'Slide': row[3],
    'Presentation': row[4],
    'Timing': row[5],
    'Content': row[6],
    'Q&A': row[7],
    'Innovation': row[8],
    'Bonus': row[9],
    'Total': row[10],
    'Feedback': row[11]
  }))
}
