import * as THREE from 'three';

export class Weather {
    constructor(scene) {
        this.scene = scene;
        
        // Time settings
        this.timeOfDay = 0.3; // Start at morning (0-1 represents full day cycle)
        this.dayDuration = 300; // 5 minutes for a full day/night cycle
        this.lastUpdate = Date.now();
        this.useServerTime = true; // Flag to use server time
        
        // Sky and atmosphere
        this.initializeSky();
        
        // Lighting
        this.ambientLight = new THREE.AmbientLight(0x404040, 1);
        this.scene.add(this.ambientLight);
        
        this.sunLight = new THREE.DirectionalLight(0xffffff, 1);
        this.sunLight.position.set(0, 100, 0);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far = 500;
        this.sunLight.shadow.camera.left = -100;
        this.sunLight.shadow.camera.right = 100;
        this.sunLight.shadow.camera.top = 100;
        this.sunLight.shadow.camera.bottom = -100;
        this.scene.add(this.sunLight);
        
        // Create fog
        this.scene.fog = new THREE.Fog(0x87ceeb, 0, 1000);
        
        // Initialize sky
        this.initializeSky();
    }
    
    initializeSky() {
        // Create a large sphere for the sky
        const skyGeometry = new THREE.SphereGeometry(900, 32, 32);
        // Make sure the sky renders behind everything else
        skyGeometry.scale(-1, 1, 1);
        
        // Create sky material
        this.skyMaterial = new THREE.MeshBasicMaterial({
            side: THREE.BackSide,
            fog: false
        });
        
        // Create sky mesh
        this.skyMesh = new THREE.Mesh(skyGeometry, this.skyMaterial);
        this.scene.add(this.skyMesh);
    }
    
    setTimeOfDay(time) {
        this.timeOfDay = time;
        this.updateWeather(); // Update weather immediately with new time
    }
    
    update() {
        const now = Date.now();
        const delta = (now - this.lastUpdate) / 1000; // Convert to seconds
        this.lastUpdate = now;
        
        // Only update time locally if not using server time
        if (!this.useServerTime) {
            this.timeOfDay = (this.timeOfDay + delta / this.dayDuration) % 1;
        }
        
        this.updateWeather();
    }
    
    updateWeather() {
        // Calculate sun position
        const sunAngle = this.timeOfDay * Math.PI * 2;
        this.sunLight.position.x = Math.cos(sunAngle) * 100;
        this.sunLight.position.y = Math.sin(sunAngle) * 100;
        
        // Update lighting based on time of day
        const isDaytime = this.timeOfDay > 0.25 && this.timeOfDay < 0.75;
        const lightIntensity = isDaytime ? 1 : 0.2;
        this.ambientLight.intensity = lightIntensity;
        this.sunLight.intensity = isDaytime ? 1 : 0;
        
        // Update sky color
        let skyColor;
        if (this.timeOfDay < 0.25) { // Night
            skyColor = new THREE.Color(0x1a237e);
        } else if (this.timeOfDay < 0.3) { // Dawn
            const t = (this.timeOfDay - 0.25) * 20;
            skyColor = new THREE.Color(0x1a237e).lerp(new THREE.Color(0xff9800), t);
        } else if (this.timeOfDay < 0.7) { // Day
            skyColor = new THREE.Color(0x87ceeb);
        } else if (this.timeOfDay < 0.75) { // Dusk
            const t = (this.timeOfDay - 0.7) * 20;
            skyColor = new THREE.Color(0x87ceeb).lerp(new THREE.Color(0xff9800), t);
        } else { // Night
            skyColor = new THREE.Color(0x1a237e);
        }
        
        this.skyMaterial.color = skyColor;
        this.scene.fog.color = skyColor;
        
        // Update fog density based on time of day
        const baseFogDistance = isDaytime ? 1000 : 500;
        this.scene.fog.far = baseFogDistance;
    }

    getTimeString() {
        // Convert timeOfDay (0-1) to hours and minutes
        const totalMinutes = this.timeOfDay * 24 * 60;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = Math.floor(totalMinutes % 60);
        
        // Format as HH:MM with 12-hour clock
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12; // Convert 0 to 12 for 12 AM
        
        return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    }

    getTimeOfDayName() {
        const hour = this.timeOfDay * 24;
        
        if (hour >= 5 && hour < 8) return 'Dawn';
        if (hour >= 8 && hour < 12) return 'Morning';
        if (hour >= 12 && hour < 14) return 'Noon';
        if (hour >= 14 && hour < 17) return 'Afternoon';
        if (hour >= 17 && hour < 20) return 'Sunset';
        if (hour >= 20 && hour < 22) return 'Dusk';
        return 'Night';
    }
} 