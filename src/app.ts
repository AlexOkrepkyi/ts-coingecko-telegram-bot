import { botLaunch, getCoinsListExp, getUniqueCoins, sendAlertsExp } from "./bot/main";


getCoinsListExp();

botLaunch();

setInterval(() =>
    getUniqueCoins(),
    10000
);

setInterval(() =>
    sendAlertsExp(),
    10000
);
