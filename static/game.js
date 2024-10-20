// Game configuration
const config = {
    type: Phaser.AUTO,
    width: 1800,
    height: 900,
    parent: 'game-container',
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    physics: {
        default: 'arcade',
        arcade: { debug: false }
    }
};

// Initialize the game test1
const game = new Phaser.Game(config);

// Game variables
let ship;
let cursors;
let bullets;
let asteroids;
let currentLevel = 0; // Start at 0 for intro screen
let levelTimer;
let scoreText;
let livesText;
let timeText;
let levelText;
let score = 0;
let lives = 3;
let bulletSound;
let introText;
let recordingText;
let isRecording = false;
let mediaRecorder;
let audioChunks = [];
let bearerToken = null;
let processedAudioUrl = null;
let transcriptionText = '';
let isSpaceLocked = false;

// Level configurations
const levelConfigs = {
    1: {
        duration: 5000,
        asteroidCount: 7,
        shipControl: true,
        asteroidsBullets: false,
        shipRotates: true,
        asteroidMovement: true,
        asteroidSplits: true
    },
    2: {
        duration: 5000,
        asteroidCount: 8,
        shipControl: false,
        asteroidsBullets: true,
        shipRotates: false,
        asteroidMovement: false,
        asteroidSplits: true
    },
    3: {
        duration: 5000,
        asteroidCount: 10,
        shipControl: true,
        asteroidsBullets: false,
        shipRotates: true,
        asteroidMovement: true,
        asteroidSplits: false
    },
    4: {
        duration: 5000,
        asteroidCount: 12,
        shipControl: true,
        asteroidsBullets: false,
        shipRotates: true,
        asteroidMovement: true,
        asteroidSplits: true
    },
    5: {
        duration: 5000,
        asteroidCount: 6,
        shipControl: true,
        asteroidsBullets: true,
        shipRotates: true,
        asteroidMovement: true,
        asteroidSplits: true,
        ufoSpawn: true
    }
};

// Preload function to load assets
function preload() {
    console.log('Preload function started');
    try {
        // Load assets for each level
        for (let level = 1; level <= 5; level++) {
            this.load.image(`ship${level}`, `assets/level${level}/ship.png`);
            this.load.image(`asteroid${level}`, `assets/level${level}/asteroid.png`);
            this.load.image(`bullet${level}`, `assets/level${level}/bullet.png`);
            this.load.image(`ufo${level}`, `assets/level${level}/ufo.png`);
        }
        console.log('All assets loaded successfully');
    } catch (error) {
        console.error('Error loading assets:', error);
    }
}

// Create function to set up the game
function create() {
    console.log('Create function started');
    try {
        // Set up intro screen
        introText = this.add.text(config.width / 2, config.height / 2 - 250, 'Paranoid Asteroids', { fontSize: '64px', fill: '#fff' });
        introText.setOrigin(0.5);

        recordingText = this.add.text(config.width / 2, config.height / 2 + 50,
            'Authenticating...\nPlease wait.',
            { fontSize: '24px', fill: '#fff', align: 'center' }
        );
        recordingText.setOrigin(0.5);

        // Authenticate first, then set up recording
        authenticate().then(() => {
            recordingText.setText('Press SPACE once to start recording your voice for 3 seconds.\n\nSay something like "A chicken".\n\nThis will generate the sound for in-game use.');
            this.startRecording = startRecording.bind(this);
            this.input.keyboard.on('keydown-SPACE', () => {
                if (!isSpaceLocked) {
                    isSpaceLocked = true;
                    this.startRecording();
                }
            });
        });

        console.log('Create function completed successfully');
    } catch (error) {
        console.error('Error in create function:', error);
    }
}

function startRecording() {
    if (isRecording) return;

    isRecording = true;
    recordingText.setText('Recording...');

    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            // Create MediaRecorder instance after getting the stream
            let options = { mimeType: 'audio/webm' }; // or 'audio/ogg' if 'audio/webm' is not supported
            if (MediaRecorder.isTypeSupported(options.mimeType)) {
                mediaRecorder = new MediaRecorder(stream, options);
            } else {
                mediaRecorder = new MediaRecorder(stream);
            }

            audioChunks = [];

            mediaRecorder.addEventListener("dataavailable", event => {
                audioChunks.push(event.data);
            });

            mediaRecorder.addEventListener("stop", () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
                createAudioFromBlob.call(this, audioBlob);
            });

            mediaRecorder.start();

            this.time.delayedCall(3000, stopRecording, [], this);
        })
        .catch(error => {
            console.error('Error accessing microphone:', error);
            isRecording = false;
            isSpaceLocked = false; // Unlock space in case of error
            recordingText.setText('Error accessing microphone. Please try again.');
        });
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        isRecording = false;
        // We keep isSpaceLocked true here, as we don't want to allow re-recording
        recordingText.setText('Recording complete. \n\nGame will start shortly.\n\n\n\n\n\n\n\n----\nYour Space Adventure is Brought to You By:\nAlexandre Abreu - Audio Designer\nBruno Lima - Code Genius\nMarcel Jardim - Graphic Artist\nWolfgang Dafert - AI Mananger');
    }
}

async function createAudioFromBlob(audioBlob) {
    if (!bearerToken) {
        console.error('No bearer token available. Please authenticate first.');
        return;
    }

    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.webm'); // Adjusted the filename

    try {
        const response = await fetch('https://gj2024api-0c10722c7282.herokuapp.com/process_audio', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${bearerToken}`,
            },
            body: formData,
        });

        if (!response.ok) {
            throw new Error('API request failed');
        }

        const data = await response.json();
        transcriptionText = data.transcription;

        if (!data.audio_data) {
            console.error('No audio data received from backend');
            return;
        }

        // Decode base64 audio data
        const binaryString = atob(data.audio_data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const audioContext = this.sound.context;

        // Decode audio data
        audioContext.decodeAudioData(bytes.buffer).then((audioBuffer) => {
            console.log('Audio decoded successfully');
            this.cache.audio.add('customBulletSound', audioBuffer);

            bulletSound = this.sound.add('customBulletSound', { loop: false });
            this.time.delayedCall(1000, () => startGame(this), [], this);
        }).catch((error) => {
            console.error('Error decoding audio data:', error);
        });

    } catch (error) {
        console.error('Error processing audio:', error);
  
    }
}

function startGame(scene) {
    currentLevel = 1;
    introText.destroy();
    recordingText.destroy();

    // Initialize game elements
    cursors = scene.input.keyboard.createCursorKeys();
    bullets = scene.physics.add.group();
    asteroids = scene.physics.add.group();

    levelText = scene.add.text(32, 32, 'Level: 1', { fontSize: '32px', fill: '#fff' });
    scoreText = scene.add.text(32, 72, 'Score: 0', { fontSize: '32px', fill: '#fff' });
    livesText = scene.add.text(32, 112, 'Lives: 3', { fontSize: '32px', fill: '#fff' });
    timeText = scene.add.text(32, 152, 'Time: 10', { fontSize: '32px', fill: '#fff' });

    setupLevel(scene);

    displayTranscription(scene);
}

// Update function called every frame
function update() {
    if (currentLevel === 0) return; // Don't update game logic on intro screen

    try {
        const levelConfig = levelConfigs[currentLevel];

        // Handle ship control and rotation
        if (levelConfig.shipControl) {
            if (levelConfig.shipRotates) {
                if (cursors.left.isDown) ship.angle -= 2;
                else if (cursors.right.isDown) ship.angle += 2;
            }
            if (Phaser.Input.Keyboard.JustDown(cursors.space)) {
                shootBullet(this);
            }
        } else {
            // Handle asteroid rotation and shooting in level 2
            if (cursors.left.isDown || cursors.right.isDown) {
                const rotationDirection = cursors.left.isDown ? -2 : 2;
                asteroids.getChildren().forEach(asteroid => {
                    asteroid.angle += rotationDirection;
                });
            }
            if (Phaser.Input.Keyboard.JustDown(cursors.space) && levelConfig.asteroidsBullets) {
                asteroids.getChildren().forEach(asteroid => {
                    shootBulletFromAsteroid(this, asteroid);
                });
            }
        }

        // Update time display
        const timeLeft = Math.ceil((levelConfig.duration - levelTimer.getElapsed()) / 1000);
        timeText.setText('Time: ' + timeLeft);

        // Handle bullet lifespan
        bullets.children.entries.forEach((bullet) => {
            // Only apply lifespan for non-level 3 bullets
            if (currentLevel !== 3) {
                bullet.lifespan -= 16;
                if (bullet.lifespan <= 0) {
                    bullet.destroy();
                }
            }
        });
    } catch (error) {
        console.error('Error in update function:', error);
    }
}

// Set up a new level
function setupLevel(scene) {
    console.log(`Setting up level ${currentLevel}`);
    const levelConfig = levelConfigs[currentLevel];

    // Reset ship
    if (ship) ship.destroy();
    ship = scene.physics.add.image(config.width / 2, config.height / 2, `ship${currentLevel}`);
    ship.setCollideWorldBounds(true);
    ship.setScale(0.2);
    ship.setImmovable(!levelConfig.shipControl);

    // Clear existing bullets and asteroids
    bullets.clear(true, true);
    asteroids.clear(true, true);

    // Spawn new asteroids
    spawnAsteroids(scene, levelConfig.asteroidCount, !levelConfig.asteroidMovement);

    // Set up collisions
    scene.physics.add.collider(bullets, asteroids, bulletHitTarget, null, scene);
    scene.physics.add.collider(ship, asteroids, shipHitAsteroid, null, scene);

    // Set up level timer
    if (levelTimer) levelTimer.remove();
    levelTimer = scene.time.delayedCall(levelConfig.duration, () => nextLevel(scene), [], scene);

    // Update UI
    levelText.setText('Level: ' + currentLevel);
    score = 0;
    scoreText.setText('Score: ' + score);
    lives = 3;
    livesText.setText('Lives: ' + lives);

    console.log(`Level ${currentLevel} setup completed`);

    // Add bouncing behavior for level 3 bullets
    if (currentLevel === 3) {
        scene.physics.world.on('worldbounds', (body) => {
            if (body.gameObject && body.gameObject.texture.key === `bullet${currentLevel}`) {
                // Do nothing, let it bounce naturally
            }
        });
    }
}

// Shoot a bullet from the ship
function shootBullet(scene) {
    const bulletX = ship.x + Math.cos(ship.rotation) * ship.width * 0.2 / 2;
    const bulletY = ship.y + Math.sin(ship.rotation) * ship.height * 0.2 / 2;

    const bullet = bullets.create(bulletX, bulletY, `bullet${currentLevel}`);
    bullet.setScale(0.2);
    bullet.setRotation(ship.rotation);
    scene.physics.velocityFromRotation(ship.rotation, 800, bullet.body.velocity);

    // Set lifespan for non-level 3 bullets
    if (currentLevel !== 3) {
        bullet.lifespan = 1000;
    }

    // Add bouncing behavior for level 3 bullets
    if (currentLevel === 3) {
        bullet.setBounce(1);
        bullet.setCollideWorldBounds(true);
    }

    // Play the custom processed bullet sound
    if (bulletSound && bulletSound.play) {
        try {
            // Stop the current playback if it's playing
            bulletSound.pause();
            bulletSound.currentTime = 0;
            // Play the sound from the beginning
            bulletSound.play();
        } catch (error) {
            console.error('Error playing bullet sound:', error);
        }
    }
}

// Shoot a bullet from an asteroid (level 2)
function shootBulletFromAsteroid(scene, asteroid) {
    const bulletX = asteroid.x + Math.cos(asteroid.rotation) * asteroid.width * 0.2 / 2;
    const bulletY = asteroid.y + Math.sin(asteroid.rotation) * asteroid.height * 0.2 / 2;

    const bullet = bullets.create(bulletX, bulletY, `bullet${currentLevel}`);
    bullet.setScale(0.2);
    bullet.setRotation(asteroid.rotation);
    scene.physics.velocityFromRotation(asteroid.rotation, 800, bullet.body.velocity);
    bullet.lifespan = 1000;
}

// Handle bullet hitting a target (asteroid or ship)
function bulletHitTarget(bullet, target) {
    bullet.destroy();
    
    if (target.texture.key.startsWith('asteroid')) {
        splitAsteroid(this, target);
    } else {
        target.destroy();
    }
    
    score += 10;
    scoreText.setText('Score: ' + score);
}

// Split asteroid into smaller pieces
function splitAsteroid(scene, asteroid) {
    const numPieces = 2;
    const newScale = asteroid.scale * 0.6; // New asteroids are 60% the size of the original

    if (newScale < 0.05) {
        // If the asteroid becomes too small, just destroy it
        asteroid.destroy();
        return;
    }

    for (let i = 0; i < numPieces; i++) {
        const piece = asteroids.create(asteroid.x, asteroid.y, asteroid.texture.key);
        piece.setScale(newScale);
        
        // Set random velocity for the new piece
        const angle = Phaser.Math.Between(0, 360);
        const speed = Phaser.Math.Between(50, 150);
        scene.physics.velocityFromAngle(angle, speed, piece.body.velocity);
        
        // Set random rotation
        piece.setAngularVelocity(Phaser.Math.Between(-200, 200));
    }

    // Destroy the original asteroid
    asteroid.destroy();
}

// Spawn asteroids for a level
function spawnAsteroids(scene, count, fixedPositions) {
    for (let i = 0; i < count; i++) {
        let x, y;
        if (fixedPositions) {
            const angle = (i / count) * Math.PI * 2;
            const radius = Math.min(config.width, config.height) * 0.4;
            x = config.width / 2 + Math.cos(angle) * radius;
            y = config.height / 2 + Math.sin(angle) * radius;
        } else {
            x = Phaser.Math.Between(0, config.width);
            y = Phaser.Math.Between(0, config.height);
        }
        const asteroid = asteroids.create(x, y, `asteroid${currentLevel}`);
        
        // Set the scale based on the current level
        asteroid.setScale(0.2);
        
        if (!fixedPositions) {
            asteroid.setVelocity(Phaser.Math.Between(-200, 200), Phaser.Math.Between(-200, 200));
        }
        
        // Add random rotation
        asteroid.setAngularVelocity(Phaser.Math.Between(-100, 100));
    }
}

// Spawn a UFO (level 5)
function spawnUFO(scene) {
    const ufo = scene.physics.add.image(0, Phaser.Math.Between(0, config.height), `ufo${currentLevel}`);
    ufo.setScale(0.15);
    ufo.setVelocityX(100);

    // Set up UFO shooting
    scene.time.addEvent({
        delay: 2000,
        callback: () => {
            if (ufo.active) {
                shootBulletFromUFO(scene, ufo);
            }
        },
        loop: true
    });

    // Set up UFO collisions
    scene.physics.add.collider(bullets, ufo, (bullet, ufo) => {
        bullet.destroy();
        ufo.destroy();
        score += 50;
        scoreText.setText('Score: ' + score);
    });

    scene.physics.add.collider(ship, ufo, () => {
        ufo.destroy();
        lives--;
        livesText.setText('Lives: ' + lives);
        checkGameOver(scene);
    });
}

// Shoot a bullet from the UFO
function shootBulletFromUFO(scene, ufo) {
    const angle = Phaser.Math.Angle.Between(ufo.x, ufo.y, ship.x, ship.y);
    const bullet = bullets.create(ufo.x, ufo.y, `bullet${currentLevel}`);
    bullet.setScale(0.2);
    bullet.setRotation(angle);
    scene.physics.velocityFromRotation(angle, 400, bullet.body.velocity);
    bullet.lifespan = 1000;
}

// Handle bullet hitting ship in level 2
function bulletHitShipLevel2(bullet, ship) {
    bullet.destroy();
    lives--;
    livesText.setText('Lives: ' + lives);
    console.log('Ship hit in level 2, ending level');
    if (levelTimer) levelTimer.remove();
    // Use a short delay to ensure all game logic has completed before moving to the next level
    this.time.delayedCall(100, () => nextLevel(this), [], this);
}

// Handle ship hitting an asteroid
function shipHitAsteroid(ship, asteroid) {
    asteroid.destroy();
    lives--;
    livesText.setText('Lives: ' + lives);
    if (lives <= 0) {
        // Game over logic
        currentLevel = 0;
        ship.destroy();
        // You might want to add a game over screen here
    }
}

// Check if the game is over
function checkGameOver(scene) {
    if (lives <= 0) {
        console.log('Game Over');
        nextLevel(scene);
    }
}

// Move to the next level or restart the game
function nextLevel(scene) {
    currentLevel++;
    if (currentLevel > 5) {
        // Game completed logic
        currentLevel = 0;
        // You might want to add a game completed screen here
    } else {
        setupLevel(scene);
    }
}

// Handle ship hitting a bullet in level 3
function shipHitBullet(ship, bullet) {
    if (currentLevel === 3) {
        bullet.destroy();
        lives--;
        livesText.setText('Lives: ' + lives);
        checkGameOver(this.scene);
    }
}

// Global error handler
window.onerror = function (message, source, lineno, colno, error) {
    console.error('Global error:', message, 'at', source, 'line', lineno, 'column', colno);
    console.error('Error object:', error);
};

// Add this function for authentication
async function authenticate() {
    try {
        const response = await fetch('https://gj2024api-0c10722c7282.herokuapp.com/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: 'gamejam2024',
                password: 'happytesting'
            }),
        });

        if (!response.ok) {
            throw new Error('Authentication failed');
        }

        const data = await response.json();
        bearerToken = data.access_token;
        console.log('Authentication successful');
    } catch (error) {
        console.error('Authentication error:', error);
    }
}

// Add this function to display the transcription
function displayTranscription(scene) {
    if (transcriptionText) {
        const transcriptionDisplay = scene.add.text(config.width / 2, config.height - 50, `Transcription: ${transcriptionText}`, { fontSize: '18px', fill: '#fff' });
        transcriptionDisplay.setOrigin(0.5);
    }
}

function updateBulletSound(newAudioBlob) {
    console.log("Received new bullet sound audio blob:", newAudioBlob);
    
    // Create a new Audio object with the received blob
    const newAudioUrl = URL.createObjectURL(newAudioBlob);
    console.log("Created new audio URL:", newAudioUrl);
    
    bulletSound = new Audio(newAudioUrl);
    console.log("Updated bulletSound with new audio");
    
    // Optional: Play the new sound once to verify it works
    bulletSound.play().then(() => {
        console.log("New bullet sound played successfully");
    }).catch(error => {
        console.error("Error playing new bullet sound:", error);
    });
}
