const { SlashCommandBuilder } = require("discord.js");
const { google } = require("googleapis");
require("dotenv").config();
const spreadsheetId = process.env.SPREADSHEET_ID;
module.exports = {
    data: new SlashCommandBuilder().setName("time-start").setDescription("Starts tracking time for you"),
    async execute(interaction) {
        await interaction.deferReply();
        const userTime = interaction.options.getString("time");
        const sheetName = "Hours";
        const columnMap = {
            ".sherwin": "B",
            sasha3_3_3: "C",
            gorge_: "D",
            vergilphiliac: "E",
            cason_ng: "F",
        };
        const { commandName, user } = interaction;

        const discordUsername = user.tag;

        const column = columnMap[discordUsername];

        if (!spreadsheetId) {
            await interaction.editReply(`Could not find a sheet with the title "${title}".`);
            return;
        }

        const today = new Date();
        const dd = String(today.getDate()).padStart(2, "0");
        const mm = String(today.getMonth() + 1).padStart(2, "0"); // January is 0!
        const yyyy = today.getFullYear();
        const spreadsheetDate = `${mm}/${dd}/${yyyy}`;

        const hours = Date.now() / 1000 / 60 / 60; // in hours

        try {
            // Authorize Google Sheets API
            const auth = new google.auth.GoogleAuth({
                keyFile: "./config.json", // Replace with your key file
                scopes: ["https://www.googleapis.com/auth/spreadsheets"],
            });
            const sheets = google.sheets({ version: "v4", auth });

            // Get spreadsheet data
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: `${sheetName}!A:A`, // Adjust range based on your columns
            });

            const rows = response.data.values || [];
            let dateFound = false;

            // Find today's date in the first column
            for (let i = 0; i < rows.length; i++) {
                if (rows[i][0] === spreadsheetDate) {
                    dateFound = true;

                    // Update the hours to start tracking time
                    // rows[i][1] = userTime;

                    const timePrevLoggedResponse = await sheets.spreadsheets.values.get({
                        spreadsheetId,
                        range: `${sheetName}!${column}${i + 1}`, // Adjust range based on your columns
                    });
                    const timePrevLogged = timePrevLoggedResponse.data.values; // at prevTime[0]
                    var totalTime = hours;
                    if (timePrevLogged != undefined) {
                        if (timePrevLogged[0][0].includes("S")) {
                            // time tracking started already
                            await interaction.editReply(`Error, you must end time tracking to start a new one.`);
                            return;
                        } else {
                            // time tracking append time
                            totalTime -= parseFloat(timePrevLogged[0][0]);
                        }
                    }
                    const returnRow = `S${totalTime}`;
                    await sheets.spreadsheets.values.update({
                        spreadsheetId,
                        range: `${sheetName}!${column}${i + 1}`,
                        valueInputOption: "USER_ENTERED",
                        resource: { values: [[returnRow]] },
                    });

                    await interaction.editReply(`Starting to track time.`);
                    return;
                }
            }

            // If the date isn't found, append a new row
            if (!dateFound) {
                await sheets.spreadsheets.values.append({
                    spreadsheetId,
                    range: `${sheetName}!A:B`,
                    valueInputOption: "USER_ENTERED",
                    resource: { values: [[spreadsheetDate, millis]] },
                });

                await interaction.editReply(`Starting to track time.`);
            }
        } catch (error) {
            console.error(error);
            await interaction.editReply("An error occurred while updating the spreadsheet.");
        }
    },
};
