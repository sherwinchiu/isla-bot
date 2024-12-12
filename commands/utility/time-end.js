const { SlashCommandBuilder } = require("discord.js");
const { google } = require("googleapis");
require("dotenv").config();
const spreadsheetId = process.env.SPREADSHEET_ID;
module.exports = {
    data: new SlashCommandBuilder().setName("time-end").setDescription("Ends tracking time for you"),
    async execute(interaction) {
        await interaction.deferReply();
        const userTime = interaction.options.getString("time");
        const sheetName = "Hours";
        const columnMap = {
            ".sherwin": "B",
            sasha3_3_3: "C",
            gorge_: "D",
            vergilphiliac: "E",
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

                    const prevTimeResponse = await sheets.spreadsheets.values.get({
                        spreadsheetId,
                        range: `${sheetName}!${column}${i + 1}`, // Adjust range based on your columns
                    });
                    const prevTime = prevTimeResponse.data.values; // at prevTime[0]

                    if (prevTime === undefined) {
                        await interaction.editReply(`Error, you need to start time to end time.`);
                        return;
                    }
                    console.log(prevTime);
                    if (prevTime[0][0].charAt(0) != "S") {
                        await interaction.editReply(`Error, you need to start time to end time.`);
                        return;
                    }
                    const prevTimeSliced = parseFloat(prevTime[0][0].split("S")[1]);
                    const currTime = Date.now() / 1000 / 60 / 60; // in hours
                    const timeElapsed = currTime - prevTimeSliced;

                    await sheets.spreadsheets.values.update({
                        spreadsheetId,
                        range: `${sheetName}!${column}${i + 1}`,
                        valueInputOption: "USER_ENTERED",
                        resource: { values: [[timeElapsed]] },
                    });

                    await interaction.editReply(`Ending track time.`);
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

                await interaction.editReply(`Ending track time.`);
            }
        } catch (error) {
            console.error(error);
            await interaction.editReply("An error occurred while updating the spreadsheet.");
        }
    },
};
