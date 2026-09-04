class Form {
    constructor() {
        this.input = createInput("");
        this.soloButton = createButton('🎮 1 Player (Solo Play)');
        this.multiButton = createButton('🌐 2 Players (2 Tabs)');
        this.localTwoPlayerButton = createButton('👥 2 Players (1 Keyboard)');
        this.resetButton = createButton('🔄 Reset Game');
        this.title = createElement('h1');
        this.subtitle = createElement('p');
        this.greeting = createElement('h2');
        this.waitingMessage = createElement('p');

        this.elements = [
            this.input,
            this.soloButton,
            this.multiButton,
            this.localTwoPlayerButton,
            this.title,
            this.subtitle,
            this.greeting,
            this.waitingMessage
        ];
    }

    getCanvasOffsets() {
        var cnv = document.querySelector('canvas');
        if (cnv) {
            var rect = cnv.getBoundingClientRect();
            return {
                left: rect.left + window.scrollX,
                top: rect.top + window.scrollY
            };
        }
        return {
            left: Math.max(10, (window.innerWidth - 1000) / 2),
            top: 25
        };
    }

    hide() {
        this.input.hide();
        this.soloButton.hide();
        this.multiButton.hide();
        this.localTwoPlayerButton.hide();
        this.title.hide();
        this.subtitle.hide();
        this.greeting.hide();
        this.waitingMessage.hide();
    }

    display() {
        var offsets = this.getCanvasOffsets();
        var ox = offsets.left;
        var oy = offsets.top;

        // Title
        this.title.html("FRUIT CATCHER");
        this.title.position(ox + 200, oy + 40);
        this.title.style('width', '600px');
        this.title.style('text-align', 'center');
        this.title.style('font-size', '52px');
        this.title.style('font-weight', '900');
        this.title.style('letter-spacing', '3px');
        this.title.style('color', '#ffe600');
        this.title.style('text-shadow', '3px 3px 10px rgba(0,0,0,0.8), 0 0 20px #ff9f1c');
        this.title.style('margin', '0');
        this.title.show();

        // Subtitle
        this.subtitle.html("Catch 20 delicious fruits in your basket to win! Avoid letting them drop.");
        this.subtitle.position(ox + 200, oy + 120);
        this.subtitle.style('width', '600px');
        this.subtitle.style('text-align', 'center');
        this.subtitle.style('font-size', '18px');
        this.subtitle.style('color', '#ffffff');
        this.subtitle.style('text-shadow', '1px 1px 4px rgba(0,0,0,0.9)');
        this.subtitle.style('margin', '0');
        this.subtitle.show();

        // Reset Button in top-right
        this.resetButton.position(ox + 870, oy + 15);
        this.resetButton.size(115, 34);
        this.resetButton.addClass('game-btn');
        this.resetButton.style('background', 'linear-gradient(135deg, #e63946, #d62828)');
        this.resetButton.style('font-size', '13px');
        this.resetButton.mousePressed(() => {
            if (window.resetGameDatabase) {
                window.resetGameDatabase();
            }
            window.location.reload();
        });
        this.resetButton.show();

        // Name Input
        this.input.position(ox + 360, oy + 180);
        this.input.size(280, 42);
        this.input.attribute('placeholder', 'Enter Your Name');
        this.input.style('font-size', '18px');
        this.input.style('text-align', 'center');
        this.input.style('border', '3px solid #f77f00');
        this.input.style('border-radius', '10px');
        this.input.style('background', '#ffffff');
        this.input.style('outline', 'none');
        this.input.style('box-shadow', '0 4px 12px rgba(0,0,0,0.3)');
        this.input.show();

        // Mode 1: Solo Play
        this.soloButton.position(ox + 360, oy + 245);
        this.soloButton.size(280, 48);
        this.soloButton.addClass('game-btn');
        this.soloButton.style('font-size', '17px');
        this.soloButton.show();
        this.soloButton.mousePressed(() => {
            this.startSoloMode();
        });

        // Mode 2: 2 Players (Online / 2 Tabs)
        this.multiButton.position(ox + 360, oy + 305);
        this.multiButton.size(280, 48);
        this.multiButton.addClass('game-btn');
        this.multiButton.style('background', 'linear-gradient(135deg, #2a9d8f, #264653)');
        this.multiButton.style('font-size', '17px');
        this.multiButton.show();
        this.multiButton.mousePressed(() => {
            this.startMultiplayerMode();
        });

        // Mode 3: 2 Players (1 Keyboard)
        this.localTwoPlayerButton.position(ox + 360, oy + 365);
        this.localTwoPlayerButton.size(280, 48);
        this.localTwoPlayerButton.addClass('game-btn');
        this.localTwoPlayerButton.style('background', 'linear-gradient(135deg, #7209b7, #3a0ca3)');
        this.localTwoPlayerButton.style('font-size', '17px');
        this.localTwoPlayerButton.show();
        this.localTwoPlayerButton.mousePressed(() => {
            this.startLocalTwoPlayerMode();
        });
    }

    startSoloMode() {
        window.isSinglePlayer = true;
        window.isLocalTwoPlayer = false;

        this.input.hide();
        this.soloButton.hide();
        this.multiButton.hide();
        this.localTwoPlayerButton.hide();
        this.subtitle.hide();

        var playerName = this.input.value().trim() || "Player 1";
        player.name = playerName;
        player.index = 1;
        player.score = 0;
        player.distance = 0;

        player.update();
        player.updateCount(2);

        // Fill dummy player 2 so game logic works uniformly
        database.ref('players/player2').set({
            name: 'Computer',
            distance: -200,
            score: 0
        });

        game.update(1);
    }

    startMultiplayerMode() {
        window.isSinglePlayer = false;
        window.isLocalTwoPlayer = false;

        this.input.hide();
        this.soloButton.hide();
        this.multiButton.hide();
        this.localTwoPlayerButton.hide();
        this.subtitle.hide();

        var playerName = this.input.value().trim() || "Player " + (playerCount + 1);
        playerCount += 1;
        player.index = playerCount;
        player.name = playerName;
        player.score = 0;
        player.distance = (player.index === 1) ? 200 : -200;

        player.updateCount(playerCount);
        player.update();

        var offsets = this.getCanvasOffsets();
        this.greeting.html("Hello " + player.name + " (Player " + player.index + ")!");
        this.greeting.position(offsets.left + 200, offsets.top + 230);
        this.greeting.style('width', '600px');
        this.greeting.style('text-align', 'center');
        this.greeting.style('color', '#ffffff');
        this.greeting.style('font-size', '38px');
        this.greeting.style('text-shadow', '2px 2px 8px rgba(0,0,0,0.8)');
        this.greeting.show();

        if (playerCount < 2) {
            this.waitingMessage.html("⏳ Waiting for Player 2 to join...<br><span style='font-size: 16px; color: #ffdd57;'>Tip: Open index.html in another browser tab or window to join as Player 2!</span>");
            this.waitingMessage.position(offsets.left + 200, offsets.top + 310);
            this.waitingMessage.style('width', '600px');
            this.waitingMessage.style('text-align', 'center');
            this.waitingMessage.style('color', '#ffffff');
            this.waitingMessage.style('font-size', '22px');
            this.waitingMessage.style('text-shadow', '2px 2px 8px rgba(0,0,0,0.8)');
            this.waitingMessage.show();
        }
    }

    startLocalTwoPlayerMode() {
        window.isSinglePlayer = false;
        window.isLocalTwoPlayer = true;

        this.input.hide();
        this.soloButton.hide();
        this.multiButton.hide();
        this.localTwoPlayerButton.hide();
        this.subtitle.hide();

        var baseName = this.input.value().trim() || "Player";
        player.name = baseName + " 1";
        player.index = 1;
        player.score = 0;
        player.distance = 200;

        player.update();
        player.updateCount(2);

        database.ref('players/player2').set({
            name: baseName + " 2",
            distance: -200,
            score: 0
        });

        game.update(1);
    }
}