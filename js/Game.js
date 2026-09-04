class Game {
    constructor() {
        this.playAgainButton = null;
    }

    getState() {
        var gameStateRef = database.ref('gameState');
        gameStateRef.on("value", function (data) {
            gameState = data.val();
        });
    }

    update(state) {
        database.ref('/').update({
            gameState: state
        });
    }

    async start() {
        if (gameState === 0) {
            player = new Player();
            player.getCount();
            Player.getPlayerInfo();

            var playerCountRef = await database.ref('playerCount').once("value");
            if (playerCountRef.exists()) {
                playerCount = playerCountRef.val() || 0;
            }
            form = new Form();
            form.display();
        }

        player1 = createSprite(300, 520);
        player1.addImage("player1", player_img);

        player2 = createSprite(700, 520);
        player2.addImage("player2", player_img);
        players = [player1, player2];
    }

    play() {
        if (form) {
            form.hide();
        }

        Player.getPlayerInfo();

        // Background
        image(back_img, 0, 0, 1000, 600);

        if (!allPlayers) return;

        var index = 0;
        for (var plr in allPlayers) {
            index = index + 1;
            if (index > 2) break;

            var dist = allPlayers[plr].distance || 0;
            var x = 500 - dist;
            // Clamp basket within screen boundaries
            x = Math.max(70, Math.min(930, x));
            var y = 520;

            if (players[index - 1]) {
                players[index - 1].x = x;
                players[index - 1].y = y;

                // Hide player 2 sprite completely in solo mode
                if (window.isSinglePlayer && index === 2) {
                    players[index - 1].visible = false;
                } else {
                    players[index - 1].visible = true;
                }
            }

            // Display player name above their basket
            if (index === 1 || !window.isSinglePlayer) {
                fill(255);
                stroke(0);
                strokeWeight(4);
                textSize(20);
                textAlign(CENTER);
                text(allPlayers[plr].name || ("Player " + index), x, y - 45);
                noStroke();
            }
        }

        // --- Controls Handling ---
        var moveSpeed = 12;

        if (window.isLocalTwoPlayer) {
            // Local 2-Player Mode on Same Keyboard
            // Player 1 controls: A (65) / D (68)
            if (keyIsDown(68)) { // D (Move Right)
                player.distance = Math.max(-430, (player.distance || 0) - moveSpeed);
                player.update();
            }
            if (keyIsDown(65)) { // A (Move Left)
                player.distance = Math.min(430, (player.distance || 0) + moveSpeed);
                player.update();
            }

            // Player 2 controls: LEFT_ARROW / RIGHT_ARROW
            if (allPlayers && allPlayers.player2) {
                var p2Dist = allPlayers.player2.distance || -200;
                var p2Changed = false;
                if (keyIsDown(RIGHT_ARROW)) {
                    p2Dist = Math.max(-430, p2Dist - moveSpeed);
                    p2Changed = true;
                }
                if (keyIsDown(LEFT_ARROW)) {
                    p2Dist = Math.min(430, p2Dist + moveSpeed);
                    p2Changed = true;
                }
                if (p2Changed) {
                    database.ref('players/player2/distance').set(p2Dist);
                }
            }
        } else {
            // Solo Mode or Online Cross-Tab Multiplayer
            // Current player can use Arrow keys OR A/D
            if ((keyIsDown(RIGHT_ARROW) || keyIsDown(68)) && player.index !== null) {
                player.distance = Math.max(-430, (player.distance || 0) - moveSpeed);
                player.update();
            }
            if ((keyIsDown(LEFT_ARROW) || keyIsDown(65)) && player.index !== null) {
                player.distance = Math.min(430, (player.distance || 0) + moveSpeed);
                player.update();
            }
        }

        // --- Fruit Generation ---
        if (frameCount % 24 === 0) {
            fruits = createSprite(random(90, 910), -20, 100, 100);
            fruits.velocityY = 6.5;
            var rand = Math.round(random(1, 5));
            switch (rand) {
                case 1: fruits.addImage("apple", fruit1_img); break;
                case 2: fruits.addImage("banana", fruit2_img); break;
                case 3: fruits.addImage("melon", fruit3_img); break;
                case 4: fruits.addImage("orange", fruit4_img); break;
                case 5: fruits.addImage("pineapple", fruit5_img); break;
            }
            fruitGroup.add(fruits);
        }

        // --- Fruit Collision & Cleanup ---
        for (var i = fruitGroup.length - 1; i >= 0; i--) {
            var fruit = fruitGroup.get(i);
            if (!fruit) continue;

            // Remove offscreen fruit to prevent memory buildup
            if (fruit.y > 630) {
                fruit.destroy();
                continue;
            }

            // Check collision with Player 1
            if (players[0] && fruit.isTouching(players[0])) {
                fruit.destroy();
                if (player.index === 1) {
                    player.score = (player.score || 0) + 1;
                    player.update();
                } else if (window.isLocalTwoPlayer) {
                    var p1Score = (allPlayers.player1?.score || 0) + 1;
                    database.ref('players/player1/score').set(p1Score);
                }
            }
            // Check collision with Player 2 (only if not Solo Mode)
            else if (!window.isSinglePlayer && players[1] && fruit.isTouching(players[1])) {
                fruit.destroy();
                if (player.index === 2) {
                    player.score = (player.score || 0) + 1;
                    player.update();
                } else if (window.isLocalTwoPlayer) {
                    var p2Score = (allPlayers.player2?.score || 0) + 1;
                    database.ref('players/player2/score').set(p2Score);
                }
            }
        }

        // Render all sprites
        drawSprites();

        // --- HUD / Scoreboard Display ---
        var p1Score = (allPlayers.player1 && allPlayers.player1.score) ? allPlayers.player1.score : 0;
        var p2Score = (allPlayers.player2 && allPlayers.player2.score) ? allPlayers.player2.score : 0;
        var p1Name = (allPlayers.player1 && allPlayers.player1.name) ? allPlayers.player1.name : "Player 1";
        var p2Name = (allPlayers.player2 && allPlayers.player2.name) ? allPlayers.player2.name : "Player 2";

        // HUD Banner
        fill(0, 0, 0, 160);
        stroke(255, 255, 255, 60);
        strokeWeight(1);
        rect(20, 15, 960, 50, 10);
        noStroke();

        textSize(22);
        fill("#ffe600");
        textAlign(LEFT);
        text("🍎 " + p1Name + " : " + p1Score, 40, 48);

        if (!window.isSinglePlayer) {
            fill("#70d6ff");
            textAlign(RIGHT);
            text("🍌 " + p2Name + " : " + p2Score, 960, 48);
        }

        fill("#ffffff");
        textAlign(CENTER);
        textSize(18);
        text("🎯 First to 20 Wins!", 500, 47);

        // --- Check Win / Game Over Condition ---
        var targetScore = 20;
        if (p1Score >= targetScore || (!window.isSinglePlayer && p2Score >= targetScore)) {
            gameState = 2;
            this.update(2);
        }
    }

    end() {
        // Clear falling fruits
        fruitGroup.destroyEach();

        // Background with dark overlay
        image(back_img, 0, 0, 1000, 600);
        fill(0, 0, 0, 200);
        rect(0, 0, 1000, 600);

        Player.getPlayerInfo();
        var p1Score = (allPlayers && allPlayers.player1 && allPlayers.player1.score) ? allPlayers.player1.score : 0;
        var p2Score = (allPlayers && allPlayers.player2 && allPlayers.player2.score) ? allPlayers.player2.score : 0;
        var p1Name = (allPlayers && allPlayers.player1 && allPlayers.player1.name) ? allPlayers.player1.name : "Player 1";
        var p2Name = (allPlayers && allPlayers.player2 && allPlayers.player2.name) ? allPlayers.player2.name : "Player 2";

        textAlign(CENTER);

        // Title
        fill("#ffbe0b");
        textSize(54);
        textStyle(BOLD);
        text("🏆 GAME OVER 🏆", 500, 160);

        // Winner Announcement
        fill("#ffffff");
        textSize(32);
        if (window.isSinglePlayer) {
            text("🎉 Congratulations, " + p1Name + "!", 500, 240);
            textSize(24);
            fill("#ffdd57");
            text("You caught all " + p1Score + " fruits successfully!", 500, 290);
        } else {
            var winner = p1Score >= p2Score ? p1Name : p2Name;
            var winningScore = Math.max(p1Score, p2Score);
            text("🎉 " + winner + " WINS! 🎉", 500, 240);
            textSize(22);
            fill("#e0e0e0");
            text(p1Name + " Score: " + p1Score + "   |   " + p2Name + " Score: " + p2Score, 500, 290);
        }

        // Instructions to restart
        fill("#a8dadc");
        textSize(20);
        text("Click 'Play Again' below or the Reset button to start a new match.", 500, 360);

        // Create Play Again button once
        if (!this.playAgainButton) {
            var cnv = document.querySelector('canvas');
            var ox = cnv ? cnv.getBoundingClientRect().left + window.scrollX : (window.innerWidth - 1000) / 2;
            var oy = cnv ? cnv.getBoundingClientRect().top + window.scrollY : 25;

            this.playAgainButton = createButton('🔄 Play Again');
            this.playAgainButton.position(ox + 390, oy + 420);
            this.playAgainButton.size(220, 52);
            this.playAgainButton.addClass('game-btn');
            this.playAgainButton.style('font-size', '20px');
            this.playAgainButton.mousePressed(() => {
                if (this.playAgainButton) {
                    this.playAgainButton.remove();
                    this.playAgainButton = null;
                }
                if (window.resetGameDatabase) {
                    window.resetGameDatabase();
                }
                window.location.reload();
            });
        }
    }
}