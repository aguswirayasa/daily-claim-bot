import axios from "axios";

function getUserInfo() {
  // Define the request options
  // Define the request payload
  const payload = {
    user: {
      id: 1353959781,
      first_name: "Kingz",
      last_name: "",
      username: "IamKingz69",
      language_code: "en",
      allows_write_to_pm: true,
    },
  };
  const getInfoOptions = {
    method: "post",
    url: "https://api.supermeow.vip/meow/info?telegram=1353959781&auth_data=%7B%22query_id%22:%22AAFlybNQAAAAAGXJs1ABhbRh%22,%22user%22:%22%7B%5C%22id%5C%22:1353959781,%5C%22first_name%5C%22:%5C%22Kingz%5C%22,%5C%22last_name%5C%22:%5C%22%5C%22,%5C%22username%5C%22:%5C%22IamKingz69%5C%22,%5C%22language_code%5C%22:%5C%22en%5C%22,%5C%22allows_write_to_pm%5C%22:true%7D%22,%22auth_date%22:%221717588359%22,%22hash%22:%221a69a0455c53526e88b803f4de3d0d4e2665fa76d78b37dec51b0640cfffc2e2%22%7D",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "sec-ch-ua":
        '"Microsoft Edge";v="125", "Chromium";v="125", "Not.A/Brand";v="24", "Microsoft Edge WebView2";v="125"',
      "sec-ch-ua-mobile": "?0",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0",
      "sec-ch-ua-platform": '"Windows"',
      Origin: "https://lfg.supermeow.vip",
      "Sec-Fetch-Site": "same-site",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Dest": "empty",
      Referer: "https://lfg.supermeow.vip/",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "Accept-Language": "en-US,en;q=0.9",
      Priority: "u=1, i",
    },
    data: payload,
  };

  // Make the API call
  axios(options)
    .then((response) => {
      console.log("API Response:", response.data);
    })
    .catch((error) => {
      console.error("API Error:", error);
    });
}

function claimToken() {
  // Define the request options
  const claimOptions = {
    method: "post",
    url: "https://api.supermeow.vip/meow/claim?telegram=1353959781&is_on_chain=false&auth_data=%7B%22query_id%22:%22AAFlybNQAAAAAGXJs1ABhbRh%22,%22user%22:%22%7B%5C%22id%5C%22:1353959781,%5C%22first_name%5C%22:%5C%22Kingz%5C%22,%5C%22last_name%5C%22:%5C%22%5C%22,%5C%22username%5C%22:%5C%22IamKingz69%5C%22,%5C%22language_code%5C%22:%5C%22en%5C%22,%5C%22allows_write_to_pm%5C%22:true%7D%22,%22auth_date%22:%221717588359%22,%22hash%22:%221a69a0455c53526e88b803f4de3d0d4e2665fa76d78b37dec51b0640cfffc2e2%22%7D",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "sec-ch-ua":
        '"Microsoft Edge";v="125", "Chromium";v="125", "Not.A/Brand";v="24", "Microsoft Edge WebView2";v="125"',
      "sec-ch-ua-mobile": "?0",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0",
      "sec-ch-ua-platform": '"Windows"',
      Origin: "https://lfg.supermeow.vip",
      "Sec-Fetch-Site": "same-site",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Dest": "empty",
      Referer: "https://lfg.supermeow.vip/",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "Accept-Language": "en-US,en;q=0.9",
      Priority: "u=1, i",
    },
  };
  // Get current time and add 3.5 hours to it
  const currentTime = new Date();
  const nextClaimTime = new Date(currentTime.getTime() + 3.5 * 60 * 60 * 1000);

  // Make the API call
  axios(claimOptions)
    .then((response) => {
      console.log("Claim Successful");
      console.log("Current balance:", response.data);

      console.log(
        "Next claim will be at:",
        nextClaimTime.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })
      );
    })
    .catch((error) => {
      console.error("API Error:", error);
    });
}
function repeatClaim() {
  claimToken();
  // Set a new setTimeout for the next claim after 3.5 hours
  setTimeout(repeatClaim, 3.5 * 60 * 60 * 1000);
}

// Call the function to start the process
repeatClaim();
