import https from "https";
import { promises as fs } from "fs";
import path from "path";
import chalk from "chalk";

const API_ENDPOINT = "https://api0.herewallet.app/api/v1/user/hot/claim";
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;

class AutoClaimApp {
  constructor() {
    this.accounts = new Map();
    this.activeIntervals = new Map();
    this.configPath = path.join(process.cwd(), "config.json");
  }

  async loadConfiguration() {
    try {
      const data = await fs.readFile(this.configPath, "utf8");
      const config = JSON.parse(data);
      this.accounts = new Map(Object.entries(config.accounts));
      console.log(chalk.yellow("Configuration loaded successfully."));
    } catch (error) {
      console.error(chalk.yellow("Failed to load configuration:"), error.message);
    }
  }

  getHeaders(account) {
    return {
      "Content-Type": "application/json",
      Network: "mainnet",
      Authorization: account.authorization,
      "Sec-Ch-Ua-Platform": "Windows",
      "Is-Sbt": "false",
      "Sec-Ch-Ua-Mobile": "?0",
      Deviceid: account.deviceId,
      "Start-App": "",
      "Telegram-Data": account.telegramData,
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
      Platform: "telegram",
      Accept: "*/*",
      Origin: "https://tgapp.herewallet.app",
      Referer: "https://tgapp.herewallet.app/",
    };
  }

  formatHot(hot) {
    return (parseInt(hot) / 1000000).toFixed(6);
  }

  async makeRequest(accountName) {
    const account = this.accounts.get(accountName);
    if (!account) {
      throw new Error(`Account ${accountName} not found`);
    }

    return new Promise((resolve, reject) => {
      const req = https.request(
        API_ENDPOINT,
        {
          method: "POST",
          headers: this.getHeaders(account),
          timeout: 30000,
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              const response = JSON.parse(data);
              const formattedHot = this.formatHot(response.hot_in_storage);
              console.log(
                chalk.yellow(`[HOT - ${accountName}] Request successful: hot_in_storage: ${formattedHot}`)
              );
              resolve(response);
            } catch (error) {
              reject(error);
            }
          });
        }
      );

      req.on("error", (error) => {
        console.error(chalk.yellow(`[HOT - ${accountName}] Request error: ${error.message}`));
        reject(error);
      });

      req.on("timeout", () => {
        req.destroy();
        console.error(chalk.yellow(`[HOT - ${accountName}] Request timed out`));
        reject(new Error("Request timed out"));
      });

      console.log(
        chalk.yellow(`[HOT - ${accountName}] Making request to ${API_ENDPOINT} with data:`)
      );
      console.log(chalk.yellow(JSON.stringify({ game_state: account.gameState }, null, 2)));

      req.write(JSON.stringify({ game_state: account.gameState }));
      req.end();
    });
  }

  async makeRequestWithRetry(accountName, retryCount = 0) {
    try {
      console.log(
        chalk.yellow(`[HOT - ${accountName}] Attempt ${retryCount + 1} of ${MAX_RETRIES}`)
      );
      const response = await this.makeRequest(accountName);
      console.log(
        chalk.yellow(`[HOT - ${accountName}] Request result:`),
        JSON.stringify(response, null, 2)
      );
      return response;
    } catch (error) {
      if (retryCount < MAX_RETRIES) {
        console.log(
          chalk.yellow(`[HOT - ${accountName}] Attempt ${retryCount + 1} failed. Retrying in ${
            RETRY_DELAY / 1000
          } seconds...`)
        );
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        return this.makeRequestWithRetry(accountName, retryCount + 1);
      }
      console.error(chalk.yellow(`[HOT - ${accountName}] All retries failed.`));
      throw error;
    }
  }

  startInterval(accountName) {
    const account = this.accounts.get(accountName);
    if (!account) {
      console.error(chalk.yellow(`[HOT - ${accountName}] Account not found`));
      return;
    }

    const hours = account.farmingInterval || 8; // Default to 8 hours if not specified
    const intervalMs = hours * 60 * 60 * 1000;

    if (this.activeIntervals.has(accountName)) {
      clearInterval(this.activeIntervals.get(accountName));
    }

    console.log(chalk.yellow(`[HOT - ${accountName}] Starting auto-claim every ${hours} hours`));

    // Initial request with logging
    this.makeRequestWithRetry(accountName)
      .then((result) =>
        console.log(chalk.yellow(`[HOT - ${accountName}] Initial claim result:`), result)
      )
      .catch((error) =>
        console.error(chalk.yellow(`[HOT - ${accountName}] Initial request failed:`), error.message)
      );

    // Set up interval with logging
    const intervalId = setInterval(() => {
      this.makeRequestWithRetry(accountName)
        .then((result) =>
          console.log(chalk.yellow(`[HOT - ${accountName}] Scheduled claim result:`), result)
        )
        .catch((error) =>
          console.error(chalk.yellow(`[HOT - ${accountName}] Scheduled request failed:`), error.message)
        );
    }, intervalMs);

    this.activeIntervals.set(accountName, intervalId);
  }

  async startAutoClaimForAllAccounts() {
    if (this.accounts.size === 0) {
      console.log(chalk.yellow("No accounts configured. Please add an account first."));
      return;
    }

    for (const accountName of this.accounts.keys()) {
      this.startInterval(accountName);
    }
  }

  async showMainMenu() {
    console.log(chalk.yellow("Starting auto-claim process for all accounts..."));
    await this.startAutoClaimForAllAccounts();
  }
}

async function main() {
  const app = new AutoClaimApp();
  await app.loadConfiguration();
  await app.showMainMenu();
}

main().catch(console.error);
