const { Server } = require('discord.io');
var Discord = require('discord.io');
const { add } = require('winston');
var logger = require('winston');
var auth = require('./auth.json');

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
    colorize: true
});

logger.level = 'debug';
// Initialize Discord Bot
var bot = new Discord.Client({
   token: auth.token,
   autorun: true
});

var servers;

var lastChannelID;
var lastUserID;
var lastUser = {
    name: "",
};
var lastGuildID;
handlers = [];
responses = [];

responses.push({
    regex: "^Hello, bot$",
    response: () => {
        sendMessage("Hello, human!")
    }
});

function sendMessage(msg)
{
    if(typeof(msg) == "string")
    {
        message = {
            message: msg,
            to: lastChannelID
        };
        bot.sendMessage(message);
    }
    else
    {
        msg.to = lastChannelID;
        bot.sendMessage(msg);
    }
}

function addHandler(handler)
{
    handlers.push(handler);
}

function removeHandler(regex, guildID)
{
    var indexOfCommand = handlers.findIndex(element => element.regex == regex && element.guildID == guildID);
    handlers.splice(indexOfCommand, 1);
    return true;
}

var helloHandler = {
    regex: "^!hello ([a-zA-Z]+)$",
    guildID: 0,
    callback: (data) => {
        sendMessage("Hello " + data[0]);
    }
};

function createResponseHandler(message, response, guild)
{
    return {
        regex: "^" + message + "$",
        guildID: guild,
        callback: (data) => {
            sendMessage(response);
        }
    };
}

function checkIfUserIsAllowed(user)
{
    if(servers[lastGuildID].roles == undefined)
    {
        return 0;
    }
    var lowestRolePos = servers[lastGuildID].roles[user.roles[0]].position;
    user.roles.forEach(element => {
        if(servers[lastGuildID].roles[element].position < lowestRolePos)
        {
            lowestRolePos = servers[lastGuildID].roles[element].position;
        }
    })
    return lowestRolePos;
}

var addResponseHandler = {
    regex: "^!addresponse ([^;]+); (.+)$",
    guildID: 0,
    callback: (data) => {
        addHandler(createResponseHandler(data[0], data[1], lastGuildID));
        sendMessage("Response created! (" + data[0] + " > " + data[1] + ")");
        console.log(createResponseHandler(data[0], data[1], lastGuildID));
    }
};

var removeResponseHandler = {
    regex: "^!removeresponse ([^;]+)$",
    guildID: 0,
    callback: (data) => {
        var h = createResponseHandler(data[0], "filler", lastGuildID);
        if(removeHandler(h.regex, lastGuildID))
        {
            sendMessage("Response removed! (" + data[0] + ")");
        }
        else
        {
            sendMessage("Response not found!");
        }
    }
};

var editResponseHandler = {
    regex: "^!editresponse ([^;]+); (.+)$",
    guildID: 0,
    callback: (data) => {
        var h = createResponseHandler(data[0], data[1]); //stara komanda novi odgovor
        if(removeHandler(h.regex))
        {
            addHandler(h);
            sendMessage("Response edited! (" + data[0] + " > " + data[1] + ")");
        }
        else
        {
            sendMessage("Response not found!");
        }
    }
};

var countHandler = {
    regex: "^!count (.+)$",
    guildID: 0,
    callback: (data) => {
        var text = "";
        data[0].split(" ").forEach(el => {
            text += el.length.toString() + " ";
        });
        sendMessage(text);
    }
};

var embedHandler = {
    regex: "^!embed$",
    guildID: 0,
    callback: () => {
        sendMessage({
            embed: {
                color: 0xff0000,
                title: "AN EMBED",
                description: "**OMG it's an embed**" + ": and it is bolded!",
            }
        });
    }
};

games = [];

function createGame(playerID, user) {
    var game = {
        username: user,
        playerID: playerID,
        grid: []
    };
    games.push(game);
    return game;
}

function findGame(playerID) {
    return games.find(el => el.playerID == playerID);
}

function getGame(playerID, user) {
    var game = findGame(playerID);
    if(game == undefined)
    {
        game = createGame(playerID, user);
    }
    
    return game;
}

function deleteGame(playerID) {
    games = games.filter(el => el.playerID != playerID);
}

var ticTacToe = {
    markMe: 'o',
    markHuman: 'x',
    markNone: '_',

    resetGame: function(game) {
        game.grid = [['_', '_', '_'], ['_', '_', '_'], ['_', '_', '_']];
        for(let i = 0; i < 3; i++)
        {
            for(let j = 0; j < 3; j++)
            {
                game.grid[i][j] == this.markNone;
            }
        }
    },

    isComplete: function(a, b, c) {
        return (a == b) && (a == c) && (a != this.markNone);
    },

    isWin: function(game) {
        let g = game.grid;
        for(let i = 0; i < 3; i++)
        {
            if(this.isComplete(g[i][0], g[i][1], g[i][2]))
            {
                return g[i][0];
            }
            else if(this.isComplete(g[0][i], g[1][i], g[2][i]))
            {
                return g[0][i];
            }
        }
        if(this.isComplete(g[0][0], g[1][1], g[2][2]))
        {
            return g[0][0];
        }
        else if(this.isComplete(g[0][2], g[1][1], g[2][0]))
        {
            return g[0][2];
        }
        return false;
    },

    isMoveLeft: function(game) {
        for(let i = 0; i < 3; i++)
        {
            for(let j = 0; j < 3; j++)
            {
                if(game.grid[i][j] == this.markNone)
                {
                    return true;
                }
            }
        }
        return false;
    },

    isDone: function(game) {
        return !this.isMoveLeft(game) || this.isWin(game) != false;
    },

    boardValue: function(game) {
        v = this.isWin(game);
        if(v ==  this.markMe)
        {
            return 10;
        }
        else if(v == this.markHuman)
        {
            return -10;
        }
        else
        {
            return 0;
        }
    },

    nextMove: function(game, m = true, d = 0, a = -1000, b = 1000) {
        let player;
        let value;
        let i1, j1;
        if(this.isDone(game))
        {
            return this.boardValue(game) * (10 - d);
        }
        if(m)
        {
            value = -1000;
            player = this.markMe;
        }
        else
        {
            value = 1000;
            player = this.markHuman;
        }
        let stop = false;
        for(let i = 0; i < 3; i++)
        {
            if(stop)
            {
                break;
            }
            for(let j = 0; j < 3; j++)
            {
                if(stop)
                {
                    break;
                }
                if(game.grid[i][j] == this.markNone)
                {
                    game.grid[i][j] = player;   
                    let v = this.nextMove(game, !m, d + 1, a, b);
                    game.grid[i][j] = this.markNone;
                    if(m)
                    {
                        if(v > value)
                        {
                            value = v;
                            i1 = i;
                            j1 = j;
                        }
                        a = Math.max(a, value);
                        stop = value >= b;
                    }
                    else
                    {
                        if(v < value)
                        {
                            value = v;
                            i1 = i;
                            j1 = j;
                        }
                        b = Math.min(b, value);
                        stop = value <= a;
                    }
                }
            }
        }
        if(d == 0)
        {
            game.grid[i1][j1] = player;
        }
        return value;
    },

    tryLastMove: function(game) {
        count = 0;
        for(let i = 0; i < 3; i++)
        {
            for(let j = 0; j < 3; j++)
            {
                if(game.grid[i][j] == this.markNone)
                {
                    count = count + 1;
                    if(count != 1)
                    {
                        return false;
                    }
                    i1 = i;
                    j1 = j;
                }
            }
        }
        game.grid[i1][j1] = this.markHuman;
        return true;
    }

};

function ticTacToePrint(game, message = "")
{
    let replaceAll = (str, find, replace) => {
        return str.replace(new RegExp(find, 'g'), replace);
    }
    var text = "";
    game.grid.forEach(row => {
        row.forEach(el => {
            text += el;
        });
        text += "\n";
    });
    text = replaceAll(text, ticTacToe.markHuman, ":x:");
    text = replaceAll(text, ticTacToe.markMe, ":o:");
    text = replaceAll(text, ticTacToe.markNone, ":black_large_square:");
    
    text += message == "" ? "" : "\n" + message;
    sendMessage({
        embed: {
            color: 0xff0000,
            title: game.username + "'s Tic Tac Toe Game",
            description: text
        }
    });
}

var ticTacToeStart = {
    regex: "^!tictactoe$",
    guildID: 0,
    callback: () => {
        var game = getGame(lastUserID, lastUser.name);

        ticTacToe.resetGame(game);

        sendMessage("<@" + lastUserID + "> started a Tic Tac Toe game!");
        ticTacToePrint(game);
    }
};

var ticTacToeMove = {
    regex: "^([abcABC]) ?([123])$",
    guildID: 0,
    callback: function(data) {
        let game = findGame(lastUserID);

        if(game == undefined)
        {
            sendMessage("Want to play tic tac toe?\nType !tictactoe to start and then use letters and numbers for positions (a1, b3, c2...)!");
            return;
        }

        y = data[0].toLowerCase().charCodeAt(0) - 97;
        x = data[1].charCodeAt(0) - 49;
        if(game.grid[y][x] != ticTacToe.markNone)
        {
            sendMessage("Position taken!");
            return;
        }
		game.grid[y][x] = ticTacToe.markHuman;

        if(!ticTacToe.isWin(game) && !ticTacToe.isDone(game))
        {
            ticTacToe.nextMove(game);

            if(!ticTacToe.isWin(game))
            {
                ticTacToe.tryLastMove(game);
            }
        }

        let winner = ticTacToe.isWin(game);
        let message = "";

        if(winner == ticTacToe.markHuman)
        {
            message = "You won! :rage:";
        }
        else if(winner == ticTacToe.markMe)
        {
            message = "You lost! :stuck_out_tongue:";
        }
        else if(ticTacToe.isDone(game))
        {
            message = "Tie! :necktie:";
        }
        ticTacToePrint(game, message);
        if(ticTacToe.isWin(game) || ticTacToe.isDone(game))
        {
            deleteGame(game.playerID);
        }
    }
};

addResponseHandler.requireAdmin = true;
addHandler(addResponseHandler);
addHandler(removeResponseHandler);
addHandler(editResponseHandler);
addHandler(helloHandler);
addHandler(countHandler);
addHandler(embedHandler);
addHandler(ticTacToeMove);
addHandler(ticTacToeStart);

var ADMIN_SUFFIX = "admin";

bot.on('ready', function (evt) {
    logger.info('Connected');
    logger.info('Logged in as: ');
    logger.info(bot.username + ' - (' + bot.id + ')');
    servers = bot.servers;
});

bot.on('message', function (user, userID, channelID, message, evt) {
    if(evt.d.member == undefined)
    {
        return;
    }

    lastChannelID = channelID;
    lastUserID = userID;
    lastUser.name = user;
    lastGuildID = evt.d.guild_id;

    if(userID != bot.id)
    {
        handlers.forEach(element => {
            let re = new RegExp(element.regex);
            if(match = re.exec(message))
            {
                if(element.guildID == 0 || lastGuildID == element.guildID)
                {
                    let adminOk;
                    if(element.requireAdmin != undefined)
                    {
                        adminOk = evt.d.member.roles.findIndex(role => {
                            return servers[lastGuildID].roles[role].name == bot.username + ADMIN_SUFFIX;
                        }) > -1;
                    }
                    else
                    {
                        adminOk = true;
                    }

                    if(adminOk)
                    {
                        match.shift();
                        element.callback(match);
                    }
                    else
                    {
                        sendMessage("Only user with role \"Kekbotadmin\" can use this command");
                    }
                }
            }
        });
    }
});