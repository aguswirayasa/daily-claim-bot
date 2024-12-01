import axios from "axios";
import { promises as fs } from "fs";
import path from "path";
import chalk from "chalk";

// Constants
const CONFIG_FILE = "accounts.json";
const LOG_FILE = "farming.log";
const API_BASE_URL = "https://tgapp-api.matchain.io/api/tgapp/v1";
const FARMING_INTERVAL = 8 * 60 * 60 * 1000; // 8 hours in milliseconds

// Utility functions
const logger = {
  async log(accountName, message) {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} [MATCHCHAIN - ${accountName}] - ${message}\n`;
    console.log(chalk.redBright(logMessage.trim()));
    await fs.appendFile(LOG_FILE, logMessage);
  },
};

// Game Service implementation
class GameService {
  constructor(apiClient) {
    this.apiClient = apiClient;
    this.checkTicketUrl = `${API_BASE_URL}/game/rule`;
    this.playGameUrl = `${API_BASE_URL}/game/play`;
    this.claimGameUrl = `${API_BASE_URL}/game/claim`;
    this.purchaseTicketUrl = `${API_BASE_URL}/daily/task/purchase`;
  }

  async checkTickets(token) {
    const response = await this.apiClient.axios.get(this.checkTicketUrl, {
      headers: { Authorization: token },
    });
    return response.data?.data?.game_count || 0;
  }

  async purchaseTickets(uid, token) {
    try {
      const response = await this.apiClient.axios.post(
        this.purchaseTicketUrl,
        { uid: parseInt(uid, 10), type: "game" },
        { headers: { Authorization: token } }
      );

      if (response.data?.code === 200) {
        await logger.log(uid, `Successfully purchased additional tickets`);
        return true;
      } else if (
        response.data?.code === 400 &&
        response.data?.err?.includes("already")
      ) {
        await logger.log(uid, `Daily ticket purchase already claimed`);
        return false;
      } else {
        await logger.log(uid, `Failed to purchase tickets: ${response.data?.err || "Unknown error"}`);
        return false;
      }
    } catch (error) {
      await logger.log(uid, `Error purchasing tickets: ${error.message}`);
      return false;
    }
  }

  async playGame(token) {
    try {
      const response = await this.apiClient.axios.get(this.playGameUrl, {
        headers: { Authorization: token },
      });
      return response.data?.data?.game_id;
    } catch (error) {
      if (
        error.response?.data?.code === 400 &&
        error.response?.data?.err?.includes("already")
      ) {
        throw new Error("game_already_claimed");
      }
      throw error;
    }
  }

  async claimGame(token, gameId) {
    const response = await this.apiClient.axios.post(
      this.claimGameUrl,
      { game_id: gameId, point: 56 },
      { headers: { Authorization: token } }
    );
    return response.data;
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async autoPlayGames(uid, token) {
    try {
      await this.purchaseTickets(uid, token);

      let tickets = await this.checkTickets(token);
      console.log(chalk.redBright(`[MATCHCHAIN - ${uid}] Account has ${tickets} game tickets`));

      while (tickets > 0) {
        console.log(chalk.redBright(`[MATCHCHAIN - ${uid}] Playing game...`));

        try {
          const gameId = await this.playGame(token);

          if (!gameId) {
            console.log(chalk.redBright(`[MATCHCHAIN - ${uid}] Unable to start game`));
            break;
          }

          await this.sleep(1000);

          try {
            const claimResponse = await this.claimGame(token, gameId);

            if (claimResponse.code === 200) {
              console.log(chalk.redBright(`[MATCHCHAIN - ${uid}] Successfully completed game`));
            } else {
              console.log(chalk.redBright(`[MATCHCHAIN - ${uid}] Failed to claim game: ${claimResponse.err}`));
              if (
                claimResponse.code === 400 &&
                claimResponse.err === "game does not exist, claim error."
              ) {
                console.log(chalk.redBright(`[MATCHCHAIN - ${uid}] Game has ended`));
                break;
              }
            }
          } catch (error) {
            console.log(chalk.redBright(`[MATCHCHAIN - ${uid}] Error claiming game: ${error.message}`));
            if (
              error.response?.data?.code === 400 &&
              error.response?.data?.err?.includes("already")
            ) {
              console.log(chalk.redBright(`[MATCHCHAIN - ${uid}] Game already claimed`));
              break;
            }
          }
        } catch (error) {
          if (error.message === "game_already_claimed") {
            console.log(chalk.redBright(`[MATCHCHAIN - ${uid}] Games already claimed, will try again next cycle`));
            break;
          }
          console.log(chalk.redBright(`[MATCHCHAIN - ${uid}] Error playing game: ${error.message}`));
          break;
        }

        await this.sleep(5000);
        tickets = await this.checkTickets(token);

        if (tickets > 0) {
          console.log(chalk.redBright(`[MATCHCHAIN - ${uid}] ${tickets} tickets remaining, playing another game...`));
        } else {
          console.log(chalk.redBright(`[MATCHCHAIN - ${uid}] No tickets remaining`));
        }
      }
    } catch (error) {
      console.log(chalk.redBright(`[MATCHCHAIN - ${uid}] Error in auto-play games: ${error.message}`));
    }
  }
}

// API Client
class ApiClient {
  constructor() {
    this.axios = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        Origin: "https://tgapp.matchain.io",
        Referer: "https://tgapp.matchain.io/",
        "Sec-Ch-Ua":
          '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
      },
    });
  }

  async login(loginParams) {
    const params = {
      ...loginParams,
      uid: parseInt(loginParams.uid, 10),
    };

    try {
      const response = await this.axios.post("/user/login", params);
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`Login failed: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  async claim(uid, token) {
    const response = await this.axios.post(
      "/point/reward/claim",
      { uid: parseInt(uid, 10) },
      { headers: { Authorization: token } }
    );
    return response.data;
  }

  async farm(uid, token) {
    const response = await this.axios.post(
      "/point/reward/farming",
      { uid: parseInt(uid, 10) },
      { headers: { Authorization: token } }
    );
    return response.data;
  }

  async getBalance(uid, token) {
    const response = await this.axios.post(
      "/point/balance",
      { uid: parseInt(uid, 10) },
      { headers: { Authorization: token } }
    );
    return response.data;
  }
}

// Account Manager
class AccountManager {
  constructor() {
    this.accounts = [];
    this.apiClient = new ApiClient();
    this.gameService = new GameService(this.apiClient);
  }

  async loadAccounts() {
    try {
      const data = await fs.readFile(CONFIG_FILE, "utf8");
      this.accounts = JSON.parse(data);
      this.accounts = this.accounts.map((acc) => ({
        ...acc,
        uid: parseInt(acc.uid, 10),
      }));
    } catch (error) {
      this.accounts = [];
    }
  }

  async farmAccount(account) {
    try {
      console.log(chalk.redBright(`[MATCHCHAIN - ${account.uid}] Attempting to login for account ${account.first_name}`));
      const loginResponse = await this.apiClient.login(account);

      if (loginResponse.code !== 200) {
        throw new Error(`Login failed: ${JSON.stringify(loginResponse)}`);
      }

      const token = loginResponse.data.token;
      console.log(chalk.redBright(`[MATCHCHAIN - ${account.uid}] Login successful`));

      const claimResponse = await this.apiClient.claim(account.uid, token);
      console.log(chalk.redBright(`[MATCHCHAIN - ${account.uid}] Claimed ${claimResponse.data} points`));

      const farmResponse = await this.apiClient.farm(account.uid, token);
      console.log(chalk.redBright(`[MATCHCHAIN - ${account.uid}] Started farming with rate ${farmResponse.data}`));

      const balanceResponse = await this.apiClient.getBalance(account.uid, token);
      console.log(chalk.redBright(`[MATCHCHAIN - ${account.uid}] Current balance: ${balanceResponse.data}`));

      try {
        await this.gameService.autoPlayGames(account.uid, token);
      } catch (gameError) {
        console.log(chalk.redBright(`[MATCHCHAIN - ${account.uid}] Error in auto-play games: ${gameError.message}`));
      }

      return true;
    } catch (error) {
      console.log(chalk.redBright(`[MATCHCHAIN - ${account.uid}] Error farming: ${error.message}`));
      return false;
    }
  }
}

// Start the application
(async () => {
  const accountManager = new AccountManager();
  await accountManager.loadAccounts();

  if (accountManager.accounts.length === 0) {
    console.log(chalk.redBright("No accounts available. Please add accounts to 'accounts.json'."));
    return;
  }

  console.log(chalk.redBright("Starting farming process for all accounts..."));
  console.log(chalk.redBright("[MATCHCHAIN - System] Farming process started"));

  const farmAccounts = async () => {
    for (const account of accountManager.accounts) {
      await accountManager.farmAccount(account);
    }
  };

  // Initial farming
  await farmAccounts();

  // Set up interval for repeated farming
  setInterval(farmAccounts, FARMING_INTERVAL);

  console.log(
    chalk.redBright(`Farming process running. Will repeat every ${
      FARMING_INTERVAL / 1000 / 60 / 60
    } hours.`)
  );
  console.log(chalk.redBright("Keep this window open to continue farming."));
})();
