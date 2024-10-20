// Game configuration
const config = {
    type: Phaser.AUTO,
    width: 1600,
    height: 1200,
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

// Initialize the game
const game = new Phaser.Game(config);

// Game variables
let ship;
let cursors;
let bullets;
let asteroids;
let currentLevel = 1;
let levelTimer;
let scoreText;
let livesText;
let timeText;
let levelText;
let score = 0;
let lives = 3;

// Level configurations
const levelConfigs = {
    1: {
        duration: 5000,
        asteroidCount: 5,
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
        asteroidCount: 8,
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
        // Set up input, groups, and UI elements
        cursors = this.input.keyboard.createCursorKeys();
        bullets = this.physics.add.group();
        asteroids = this.physics.add.group();

        levelText = this.add.text(32, 32, 'Level: 1', { fontSize: '32px', fill: '#fff' });
        scoreText = this.add.text(32, 72, 'Score: 0', { fontSize: '32px', fill: '#fff' });
        livesText = this.add.text(32, 112, 'Lives: 3', { fontSize: '32px', fill: '#fff' });
        timeText = this.add.text(32, 152, 'Time: 10', { fontSize: '32px', fill: '#fff' });

        // Set up the initial level
        setupLevel(this);

        console.log('Create function completed successfully');
    } catch (error) {
        console.error('Error in create function:', error);
    }
}

// Update function called every frame
function update() {
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
    asteroids.clear(true, true);
    bullets.clear(true, true);

    // Spawn new asteroids
    spawnAsteroids(scene, levelConfig.asteroidCount, !levelConfig.asteroidMovement);

    // Set up collisions based on level
    if (currentLevel === 2) {
        scene.physics.add.collider(bullets, ship, bulletHitShipLevel2, null, scene);
    } else {
        scene.physics.add.collider(bullets, asteroids, bulletHitTarget, null, scene);
        scene.physics.add.collider(ship, asteroids, shipHitAsteroid, null, scene);
        // Add collision handler for level 3
        if (currentLevel === 3) {
            scene.physics.add.collider(ship, bullets, shipHitBullet, null, scene);
        }
    }

    // Spawn UFO if needed
    if (levelConfig.ufoSpawn) {
        spawnUFO(scene);
    }

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
        asteroid.setScale(0.2);
        if (!fixedPositions) {
            asteroid.setVelocity(Phaser.Math.Between(-200, 200), Phaser.Math.Between(-200, 200));
        }
    }
}

// Handle bullet hitting a target (asteroid or ship)
function bulletHitTarget(bullet, target) {
    if (target !== ship) {
        const levelConfig = levelConfigs[currentLevel];
        if (levelConfig.asteroidSplits && target.texture.key.includes('asteroid')) {
            splitAsteroid(this, target);
        } else {
            target.destroy();
        }
        score += 10;
        scoreText.setText('Score: ' + score);
    }
    bullet.destroy();
}

// Split an asteroid into smaller asteroids
function splitAsteroid(scene, asteroid) {
    console.log('Splitting asteroid');
    const smallAsteroidCount = 2;
    for (let i = 0; i < smallAsteroidCount; i++) {
        const smallAsteroid = asteroids.create(asteroid.x, asteroid.y, `asteroid${currentLevel}`);
        smallAsteroid.setScale(asteroid.scale * 0.5); // Half the size of the original
        smallAsteroid.setVelocity(
            Phaser.Math.Between(-150, 150),
            Phaser.Math.Between(-150, 150)
        );
    }
    asteroid.destroy();
    console.log('Asteroid split completed');
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
    if (!levelConfigs[currentLevel].asteroidsBullets) {
        asteroid.destroy();
        lives--;
        livesText.setText('Lives: ' + lives);
        checkGameOver(this.scene);
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
    console.log('Moving to level:', currentLevel);
    if (currentLevel > 5) {
        console.log('Game completed');
        scene.scene.restart();
        currentLevel = 1;
    } else {
        if (levelTimer) levelTimer.remove(); // Ensure any existing timer is removed
        try {
            setupLevel(scene);
        } catch (error) {
            console.error('Error setting up level:', error);
            // Attempt to recover by moving to the next level or restarting the game
            if (currentLevel < 5) {
                currentLevel++;
                setupLevel(scene);
            } else {
                scene.scene.restart();
                currentLevel = 1;
            }
        }
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
window.onerror = function(message, source, lineno, colno, error) {
    console.error('Global error:', message, 'at', source, 'line', lineno, 'column', colno);
    console.error('Error object:', error);
};
