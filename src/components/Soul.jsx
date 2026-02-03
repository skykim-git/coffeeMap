import React, { useState, useEffect, useRef } from 'react';
import { Skull, Heart, Zap } from 'lucide-react';

const MetroSoulsBoss = () => {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('playing'); // playing, dead, victory
  const [player, setPlayer] = useState({
    x: 150,
    y: 400,
    health: 100,
    maxHealth: 100,
    stamina: 100,
    maxStamina: 100,
    width: 30,
    height: 40,
    velocityY: 0,
    isGrounded: false,
    isDodging: false,
    attackCooldown: 0,
    invulnerable: false,
    facingRight: true
  });
  
  const [boss, setBoss] = useState({
    x: 600,
    y: 350,
    health: 300,
    maxHealth: 300,
    width: 80,
    height: 100,
    phase: 1,
    attackTimer: 0,
    isAttacking: false,
    attackType: null,
    facingLeft: true
  });
  
  const [attacks, setAttacks] = useState([]);
  const [particles, setParticles] = useState([]);
  const keysPressed = useRef({});
  const groundY = 450;
  const gravity = 0.8;

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const gameLoop = setInterval(() => {
      updatePlayer();
      updateBoss();
      updateAttacks();
      updateParticles();
      checkCollisions();
    }, 1000 / 60);

    return () => clearInterval(gameLoop);
  }, [player, boss, attacks, particles, gameState]);

  // Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    const draw = () => {
      // Metro background
      ctx.fillStyle = '#0a0a15';
      ctx.fillRect(0, 0, 800, 500);
      
      // Subway tunnel depth - curved ceiling
      ctx.fillStyle = '#16162a';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(400, 100, 800, 0);
      ctx.lineTo(800, 150);
      ctx.lineTo(0, 150);
      ctx.closePath();
      ctx.fill();
      
      // Metro tiles on walls
      ctx.strokeStyle = '#2d2d44';
      ctx.lineWidth = 1;
      for (let y = 150; y < 450; y += 50) {
        for (let i = 0; i < 800; i += 100) {
          ctx.strokeRect(i, y, 100, 50);
        }
      }
      
      // Subway pillars
      ctx.fillStyle = '#1a1a2e';
      const pillars = [150, 400, 650];
      pillars.forEach(x => {
        ctx.fillRect(x - 15, 150, 30, 300);
        ctx.fillStyle = '#2d2d44';
        ctx.fillRect(x - 15, 150, 5, 300);
        ctx.fillRect(x + 10, 150, 5, 300);
        ctx.fillStyle = '#1a1a2e';
      });
      
      // Train car in background (left side)
      ctx.fillStyle = '#cc3333';
      ctx.fillRect(10, 200, 120, 80);
      ctx.fillStyle = '#992222';
      ctx.fillRect(10, 200, 120, 15); // Top stripe
      ctx.fillStyle = '#333';
      // Windows
      ctx.fillRect(20, 215, 25, 35);
      ctx.fillRect(55, 215, 25, 35);
      ctx.fillRect(90, 215, 25, 35);
      // Door
      ctx.fillStyle = '#444';
      ctx.fillRect(115, 225, 10, 50);
      
      // Graffiti on walls
      ctx.fillStyle = '#ff6b9d';
      ctx.font = 'bold 20px Arial';
      ctx.fillText('DANGER', 250, 250);
      ctx.fillStyle = '#00d4ff';
      ctx.fillText('EXIT →', 550, 300);
      
      // Caution stripes
      ctx.fillStyle = '#000';
      for (let i = 0; i < 800; i += 40) {
        ctx.fillRect(i, groundY - 10, 20, 10);
      }
      ctx.fillStyle = '#ffcc00';
      for (let i = 20; i < 800; i += 40) {
        ctx.fillRect(i, groundY - 10, 20, 10);
      }
      
      // Train tracks
      ctx.fillStyle = '#555';
      // Left track
      ctx.fillRect(50, groundY + 5, 10, 40);
      ctx.fillRect(45, groundY + 15, 20, 5);
      ctx.fillRect(45, groundY + 30, 20, 5);
      // Right track
      ctx.fillRect(740, groundY + 5, 10, 40);
      ctx.fillRect(735, groundY + 15, 20, 5);
      ctx.fillRect(735, groundY + 30, 20, 5);
      
      // Rail ties
      ctx.fillStyle = '#333';
      for (let i = 0; i < 800; i += 60) {
        ctx.fillRect(i, groundY + 20, 40, 8);
      }
      
      // Ground platform
      ctx.fillStyle = '#16213e';
      ctx.fillRect(0, groundY, 800, 50);
      
      // Platform edge line
      ctx.fillStyle = '#ffcc00';
      ctx.fillRect(0, groundY - 2, 800, 2);
      
      // Emergency exit sign
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(680, 180, 80, 30);
      ctx.fillStyle = '#000';
      ctx.font = 'bold 14px Arial';
      ctx.fillText('EXIT', 695, 200);
      
      // Station number sign
      ctx.fillStyle = '#2d2d44';
      ctx.fillRect(20, 160, 60, 40);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Arial';
      ctx.fillText('13', 35, 188);
      
      // Metro lights with fixtures
      for (let i = 100; i < 800; i += 200) {
        // Light fixture
        ctx.fillStyle = '#2d2d44';
        ctx.fillRect(i - 15, 20, 30, 10);
        
        // Light bulb
        ctx.fillStyle = boss.phase === 2 ? '#ff4444' : '#ffcc00';
        ctx.beginPath();
        ctx.arc(i, 30, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Light glow
        const gradient = ctx.createRadialGradient(i, 30, 8, i, 30, 60);
        gradient.addColorStop(0, boss.phase === 2 ? 'rgba(255, 68, 68, 0.4)' : 'rgba(255, 204, 0, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 204, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(i, 30, 60, 0, Math.PI * 2);
        ctx.fill();
        
        // Light beam effect
        ctx.fillStyle = boss.phase === 2 ? 'rgba(255, 68, 68, 0.1)' : 'rgba(255, 204, 0, 0.1)';
        ctx.beginPath();
        ctx.moveTo(i - 20, 35);
        ctx.lineTo(i - 40, groundY);
        ctx.lineTo(i + 40, groundY);
        ctx.lineTo(i + 20, 35);
        ctx.closePath();
        ctx.fill();
      }
      
      // Flickering light effect for phase 2
      if (boss.phase === 2 && Math.random() > 0.8) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
        ctx.fillRect(0, 0, 800, 500);
      }
      
      // Draw attacks
      attacks.forEach(attack => {
        if (attack.type === 'slash') {
          ctx.strokeStyle = '#ff3366';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(attack.x, attack.y, attack.radius, 0, Math.PI * 2);
          ctx.stroke();
        } else if (attack.type === 'projectile') {
          ctx.fillStyle = '#ff6b9d';
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#ff6b9d';
          ctx.beginPath();
          ctx.arc(attack.x, attack.y, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        } else if (attack.type === 'ground') {
          ctx.fillStyle = '#ff3366';
          ctx.fillRect(attack.x, groundY - 5, attack.width, 10);
          
          // Warning indicator
          if (attack.timer < 30) {
            ctx.strokeStyle = '#ffcc00';
            ctx.lineWidth = 2;
            ctx.strokeRect(attack.x, groundY - 80, attack.width, 80);
          }
        }
      });
      
      // Draw particles
      particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.fillRect(p.x, p.y, 3, 3);
      });
      ctx.globalAlpha = 1;
      
      // Draw player - Pixel art style
      if (player.isDodging) ctx.globalAlpha = 0.5;
      
      const px = Math.floor(player.x);
      const py = Math.floor(player.y);
      const pColor = player.invulnerable ? '#44ff88' : '#00d4ff';
      const pDark = player.invulnerable ? '#228844' : '#0088bb';
      const pLight = player.invulnerable ? '#88ffbb' : '#44ddff';
      
      // Head
      ctx.fillStyle = '#ffd4a3';
      ctx.fillRect(px + 10, py + 4, 10, 10);
      
      // Helmet
      ctx.fillStyle = '#8899aa';
      ctx.fillRect(px + 9, py + 2, 12, 6);
      ctx.fillStyle = '#556677';
      ctx.fillRect(px + 14, py + 6, 4, 2);
      
      // Body - armor
      ctx.fillStyle = pColor;
      ctx.fillRect(px + 8, py + 14, 14, 12);
      ctx.fillStyle = pDark;
      ctx.fillRect(px + 8, py + 14, 4, 12); // Left side shadow
      ctx.fillStyle = pLight;
      ctx.fillRect(px + 18, py + 14, 4, 12); // Right side highlight
      
      // Belt
      ctx.fillStyle = '#8b4513';
      ctx.fillRect(px + 8, py + 22, 14, 3);
      ctx.fillStyle = '#daa520';
      ctx.fillRect(px + 14, py + 22, 3, 3);
      
      // Legs
      ctx.fillStyle = '#556677';
      ctx.fillRect(px + 10, py + 26, 5, 10);
      ctx.fillRect(px + 16, py + 26, 5, 10);
      ctx.fillStyle = '#333';
      ctx.fillRect(px + 10, py + 36, 5, 4);
      ctx.fillRect(px + 16, py + 36, 5, 4);
      
      // Arms
      ctx.fillStyle = pDark;
      if (player.attackCooldown > 15) {
        // Attack pose - arm extended
        if (player.facingRight) {
          ctx.fillRect(px + 22, py + 16, 4, 8);
        } else {
          ctx.fillRect(px + 4, py + 16, 4, 8);
        }
      } else {
        // Idle pose
        ctx.fillRect(px + 6, py + 16, 4, 10);
        ctx.fillRect(px + 20, py + 16, 4, 10);
      }
      
      // Hand/glove
      ctx.fillStyle = '#8899aa';
      if (player.attackCooldown > 15) {
        if (player.facingRight) {
          ctx.fillRect(px + 22, py + 24, 4, 4);
        } else {
          ctx.fillRect(px + 4, py + 24, 4, 4);
        }
      }
      
      // Sword - pixel art
      if (player.attackCooldown > 15) {
        const swordX = player.facingRight ? px + 26 : px;
        const swordDir = player.facingRight ? 1 : -1;
        
        // Blade
        ctx.fillStyle = '#e0e0e0';
        ctx.fillRect(swordX, py + 18, 3 * swordDir, 2);
        ctx.fillRect(swordX + (3 * swordDir), py + 16, 6 * swordDir, 2);
        ctx.fillRect(swordX + (9 * swordDir), py + 14, 4 * swordDir, 2);
        
        // Blade shine
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(swordX + (4 * swordDir), py + 16, 4 * swordDir, 1);
        
        // Guard
        ctx.fillStyle = '#daa520';
        ctx.fillRect(swordX - (swordDir), py + 18, 4 * swordDir, 2);
        
        // Handle
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(swordX - (2 * swordDir), py + 20, 3 * swordDir, 4);
      }
      
      ctx.globalAlpha = 1;
      
      // Draw boss - Pixel art phantom
      const bx = Math.floor(boss.x);
      const by = Math.floor(boss.y);
      const bColor = boss.phase === 2 ? '#ff3366' : '#9d4edd';
      const bDark = boss.phase === 2 ? '#cc0033' : '#7b2cbf';
      const bLight = boss.phase === 2 ? '#ff6699' : '#c77dff';
      
      // Floating animation
      const floatOffset = Math.sin(Date.now() / 500) * 3;
      const by_float = by + floatOffset;
      
      // Phantom tail/wisp bottom
      ctx.fillStyle = bDark;
      ctx.globalAlpha = 0.7;
      for (let i = 0; i < 5; i++) {
        const wispY = by_float + 80 + i * 4;
        const wispWidth = 60 - i * 8;
        const wispX = bx + 10 + i * 4;
        ctx.fillRect(wispX, wispY, wispWidth, 4);
      }
      ctx.globalAlpha = 1;
      
      // Main body - hooded phantom
      ctx.fillStyle = bColor;
      ctx.fillRect(bx + 20, by_float + 20, 40, 60);
      
      // Body shading
      ctx.fillStyle = bDark;
      ctx.fillRect(bx + 20, by_float + 20, 10, 60);
      ctx.fillRect(bx + 20, by_float + 60, 40, 10);
      
      // Body highlights
      ctx.fillStyle = bLight;
      ctx.fillRect(bx + 50, by_float + 20, 10, 60);
      
      // Hood
      ctx.fillStyle = bDark;
      ctx.fillRect(bx + 15, by_float + 10, 50, 15);
      ctx.fillRect(bx + 10, by_float + 15, 60, 10);
      
      // Hood shadow (face area)
      ctx.fillStyle = '#000000';
      ctx.fillRect(bx + 25, by_float + 20, 30, 25);
      
      // Glowing eyes
      const eyeColor = boss.isAttacking ? '#ff0000' : '#ffcc00';
      ctx.fillStyle = eyeColor;
      ctx.shadowBlur = 10;
      ctx.shadowColor = eyeColor;
      
      // Left eye
      ctx.fillRect(bx + 30, by_float + 30, 6, 6);
      // Right eye  
      ctx.fillRect(bx + 44, by_float + 30, 6, 6);
      
      // Eye pupils
      ctx.fillStyle = '#000000';
      ctx.fillRect(bx + 32, by_float + 32, 2, 2);
      ctx.fillRect(bx + 46, by_float + 32, 2, 2);
      
      ctx.shadowBlur = 0;
      
      // Skeletal arms
      ctx.fillStyle = '#e0e0e0';
      if (boss.isAttacking) {
        // Arms raised
        ctx.fillRect(bx + 8, by_float + 30, 8, 20);
        ctx.fillRect(bx + 64, by_float + 30, 8, 20);
        
        // Hands/claws
        ctx.fillStyle = '#cccccc';
        ctx.fillRect(bx + 6, by_float + 50, 4, 8);
        ctx.fillRect(bx + 10, by_float + 50, 4, 8);
        ctx.fillRect(bx + 66, by_float + 50, 4, 8);
        ctx.fillRect(bx + 70, by_float + 50, 4, 8);
      } else {
        // Arms at sides
        ctx.fillRect(bx + 12, by_float + 40, 6, 25);
        ctx.fillRect(bx + 62, by_float + 40, 6, 25);
        
        // Hands
        ctx.fillStyle = '#cccccc';
        ctx.fillRect(bx + 12, by_float + 65, 6, 6);
        ctx.fillRect(bx + 62, by_float + 65, 6, 6);
      }
      
      // Phase 2 energy aura
      if (boss.phase === 2) {
        ctx.strokeStyle = '#ff3366';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.3 + Math.sin(Date.now() / 200) * 0.2;
        ctx.strokeRect(bx + 10, by_float + 10, 60, 80);
        ctx.strokeRect(bx + 5, by_float + 5, 70, 90);
        ctx.globalAlpha = 1;
      }
      
      // Spectral particles around boss
      if (Math.random() > 0.7) {
        const pX = bx + Math.random() * 80;
        const pY = by_float + Math.random() * 100;
        createParticles(pX, pY, bColor, 1);
      }
      
      // Boss health bar
      const bossBarWidth = 300;
      const bossBarX = 250;
      ctx.fillStyle = '#2d2d44';
      ctx.fillRect(bossBarX, 20, bossBarWidth, 20);
      ctx.fillStyle = boss.phase === 2 ? '#ff3366' : '#9d4edd';
      ctx.fillRect(bossBarX, 20, (boss.health / boss.maxHealth) * bossBarWidth, 20);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(bossBarX, 20, bossBarWidth, 20);
      
      // Boss name
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('SUBWAY PHANTOM', 400, 15);
      
      if (boss.phase === 2) {
        ctx.fillStyle = '#ff3366';
        ctx.fillText('ENRAGED', 400, 55);
      }
    };
    
    const animationId = requestAnimationFrame(function animate() {
      draw();
      requestAnimationFrame(animate);
    });
    
    return () => cancelAnimationFrame(animationId);
  }, [player, boss, attacks, particles, gameState]);

  const updatePlayer = () => {
    setPlayer(prev => {
      let newState = { ...prev };
      
      // Gravity
      if (newState.y < groundY - newState.height) {
        newState.velocityY += gravity;
        newState.isGrounded = false;
      } else {
        newState.y = groundY - newState.height;
        newState.velocityY = 0;
        newState.isGrounded = true;
      }
      newState.y += newState.velocityY;
      
      // Movement
      if (!newState.isDodging) {
        if (keysPressed.current['a'] || keysPressed.current['ArrowLeft']) {
          newState.x = Math.max(0, newState.x - 4);
          newState.facingRight = false;
        }
        if (keysPressed.current['d'] || keysPressed.current['ArrowRight']) {
          newState.x = Math.min(800 - newState.width, newState.x + 4);
          newState.facingRight = true;
        }
      }
      
      // Stamina regen
      if (newState.stamina < newState.maxStamina && !newState.isDodging) {
        newState.stamina = Math.min(newState.maxStamina, newState.stamina + 0.5);
      }
      
      // Cooldowns
      if (newState.attackCooldown > 0) newState.attackCooldown--;
      if (newState.invulnerable && newState.attackCooldown === 0) {
        newState.invulnerable = false;
      }
      if (newState.isDodging) {
        newState.isDodging = false;
      }
      
      return newState;
    });
  };

  const updateBoss = () => {
    setBoss(prev => {
      let newState = { ...prev };
      
      // Check phase transition
      if (newState.health < newState.maxHealth * 0.5 && newState.phase === 1) {
        newState.phase = 2;
        createParticles(newState.x + 40, newState.y + 50, '#ff3366', 30);
      }
      
      // Attack logic
      newState.attackTimer++;
      const attackSpeed = newState.phase === 2 ? 60 : 90;
      
      if (newState.attackTimer > attackSpeed && !newState.isAttacking) {
        newState.isAttacking = true;
        newState.attackTimer = 0;
        
        // Choose attack
        const rand = Math.random();
        if (newState.phase === 1) {
          if (rand < 0.5) {
            newState.attackType = 'slash';
            setTimeout(() => createBossAttack('slash'), 300);
          } else {
            newState.attackType = 'projectile';
            setTimeout(() => createBossAttack('projectile'), 300);
          }
        } else {
          // Phase 2 attacks
          if (rand < 0.33) {
            newState.attackType = 'slash';
            setTimeout(() => {
              createBossAttack('slash');
              setTimeout(() => createBossAttack('slash'), 200);
            }, 300);
          } else if (rand < 0.66) {
            newState.attackType = 'projectile';
            setTimeout(() => {
              for (let i = 0; i < 3; i++) {
                setTimeout(() => createBossAttack('projectile'), i * 150);
              }
            }, 300);
          } else {
            newState.attackType = 'ground';
            setTimeout(() => createBossAttack('ground'), 500);
          }
        }
        
        setTimeout(() => {
          setBoss(b => ({ ...b, isAttacking: false }));
        }, 1000);
      }
      
      return newState;
    });
  };

  const createBossAttack = (type) => {
    if (type === 'slash') {
      setAttacks(prev => [...prev, {
        type: 'slash',
        x: boss.x - 50,
        y: boss.y + 50,
        radius: 20,
        timer: 0,
        maxTimer: 20
      }]);
    } else if (type === 'projectile') {
      const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
      setAttacks(prev => [...prev, {
        type: 'projectile',
        x: boss.x,
        y: boss.y + 50,
        vx: Math.cos(angle) * 6,
        vy: Math.sin(angle) * 6,
        timer: 0
      }]);
    } else if (type === 'ground') {
      setAttacks(prev => [...prev, {
        type: 'ground',
        x: player.x - 50,
        width: 150,
        timer: 0,
        maxTimer: 60
      }]);
    }
  };

  const updateAttacks = () => {
    setAttacks(prev => prev.map(attack => {
      const updated = { ...attack, timer: attack.timer + 1 };
      
      if (attack.type === 'slash') {
        updated.radius += 5;
      } else if (attack.type === 'projectile') {
        updated.x += attack.vx;
        updated.y += attack.vy;
      }
      
      return updated;
    }).filter(attack => {
      if (attack.type === 'slash') return attack.timer < attack.maxTimer;
      if (attack.type === 'projectile') return attack.x > 0 && attack.x < 800 && attack.y > 0 && attack.y < 500;
      if (attack.type === 'ground') return attack.timer < attack.maxTimer;
      return true;
    }));
  };

  const updateParticles = () => {
    setParticles(prev => prev.map(p => ({
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy,
      life: p.life - 0.02
    })).filter(p => p.life > 0));
  };

  const createParticles = (x, y, color, count) => {
    const newParticles = [];
    for (let i = 0; i < count; i++) {
      newParticles.push({
        x, y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        life: 1,
        color
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
  };

  const checkCollisions = () => {
    // Player attacks boss
    if (player.attackCooldown > 15) {
      const attackRange = 40;
      const attackX = player.facingRight ? player.x + player.width : player.x - attackRange;
      
      if (attackX < boss.x + boss.width && attackX + attackRange > boss.x &&
          player.y < boss.y + boss.height && player.y + player.height > boss.y) {
        setBoss(prev => {
          const newHealth = Math.max(0, prev.health - 15);
          if (newHealth === 0) {
            setGameState('victory');
          }
          return { ...prev, health: newHealth };
        });
        createParticles(boss.x + 40, boss.y + 50, '#ffcc00', 10);
        setPlayer(prev => ({ ...prev, attackCooldown: 0 }));
      }
    }
    
    // Boss attacks player
    if (player.invulnerable) return;
    
    attacks.forEach(attack => {
      let hit = false;
      
      if (attack.type === 'slash') {
        const dist = Math.sqrt((attack.x - (player.x + player.width/2))**2 + 
                               (attack.y - (player.y + player.height/2))**2);
        if (dist < attack.radius + 20) hit = true;
      } else if (attack.type === 'projectile') {
        if (attack.x > player.x && attack.x < player.x + player.width &&
            attack.y > player.y && attack.y < player.y + player.height) {
          hit = true;
        }
      } else if (attack.type === 'ground' && attack.timer > 30) {
        if (player.x + player.width > attack.x && player.x < attack.x + attack.width &&
            player.isGrounded) {
          hit = true;
        }
      }
      
      if (hit) {
        setPlayer(prev => {
          const newHealth = Math.max(0, prev.health - 20);
          if (newHealth === 0) {
            setGameState('dead');
          }
          return { ...prev, health: newHealth, invulnerable: true, attackCooldown: 30 };
        });
        createParticles(player.x + 15, player.y + 20, '#ff3366', 15);
      }
    });
  };

  const handleKeyDown = (e) => {
    keysPressed.current[e.key] = true;
    
    if ((e.key === 'w' || e.key === ' ' || e.key === 'ArrowUp') && player.isGrounded) {
      setPlayer(prev => ({ ...prev, velocityY: -15 }));
    }
    
    if (e.key === 'Shift' && player.stamina >= 25 && !player.isDodging) {
      setPlayer(prev => ({
        ...prev,
        isDodging: true,
        invulnerable: true,
        attackCooldown: 20,
        stamina: prev.stamina - 25,
        x: prev.facingRight ? 
          Math.min(800 - prev.width, prev.x + 80) : 
          Math.max(0, prev.x - 80)
      }));
    }
    
    if ((e.key === 'j' || e.key === 'Enter') && player.attackCooldown === 0 && player.stamina >= 15) {
      setPlayer(prev => ({ 
        ...prev, 
        attackCooldown: 25,
        stamina: prev.stamina - 15
      }));
    }
  };

  const handleKeyUp = (e) => {
    keysPressed.current[e.key] = false;
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [player, boss]);

  const resetGame = () => {
    setGameState('playing');
    setPlayer({
      x: 150, y: 400, health: 100, maxHealth: 100,
      stamina: 100, maxStamina: 100, width: 30, height: 40,
      velocityY: 0, isGrounded: false, isDodging: false,
      attackCooldown: 0, invulnerable: false, facingRight: true
    });
    setBoss({
      x: 600, y: 350, health: 300, maxHealth: 300,
      width: 80, height: 100, phase: 1, attackTimer: 0,
      isAttacking: false, attackType: null, facingLeft: true
    });
    setAttacks([]);
    setParticles([]);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4">
      <div className="mb-4 text-center">
        <h1 className="text-4xl font-bold text-purple-400 mb-2">METRO SOULS</h1>
        <p className="text-gray-400">Boss Fight Demo</p>
      </div>
      
      <div className="relative">
        <canvas 
          ref={canvasRef} 
          width={800} 
          height={500}
          className="border-4 border-purple-600 rounded"
        />
        
        {gameState !== 'playing' && (
          <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center">
            <div className="text-center">
              {gameState === 'dead' ? (
                <>
                  <Skull className="w-24 h-24 text-red-500 mx-auto mb-4" />
                  <h2 className="text-4xl font-bold text-red-500 mb-4">YOU DIED</h2>
                </>
              ) : (
                <>
                  <Zap className="w-24 h-24 text-yellow-400 mx-auto mb-4" />
                  <h2 className="text-4xl font-bold text-yellow-400 mb-4">VICTORY</h2>
                </>
              )}
              <button
                onClick={resetGame}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xl font-bold"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-4 w-full max-w-3xl">
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Heart className="w-5 h-5 text-red-500" />
              <span className="text-white font-bold">HP</span>
            </div>
            <div className="bg-gray-800 h-6 rounded overflow-hidden">
              <div 
                className="bg-red-500 h-full transition-all"
                style={{ width: `${(player.health / player.maxHealth) * 100}%` }}
              />
            </div>
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-5 h-5 text-green-400" />
              <span className="text-white font-bold">Stamina</span>
            </div>
            <div className="bg-gray-800 h-6 rounded overflow-hidden">
              <div 
                className="bg-green-400 h-full transition-all"
                style={{ width: `${(player.stamina / player.maxStamina) * 100}%` }}
              />
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 p-4 rounded text-sm text-gray-300">
          <p className="font-bold text-purple-400 mb-2">Controls:</p>
          <div className="grid grid-cols-2 gap-2">
            <p><span className="text-white">A/D or ←/→</span> - Move</p>
            <p><span className="text-white">W/Space/↑</span> - Jump</p>
            <p><span className="text-white">J/Enter</span> - Attack (15 stamina)</p>
            <p><span className="text-white">Shift</span> - Dodge Roll (25 stamina)</p>
          </div>
          <p className="mt-2 text-yellow-400">Tip: Dodge through attacks to avoid damage!</p>
        </div>
      </div>
    </div>
  );
};

export default MetroSoulsBoss;