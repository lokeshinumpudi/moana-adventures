import * as THREE from 'three';

export class Weather {
    constructor(scene) {
        this.scene = scene;
        this.timeOfDay = 0; // 0 to 1 (0 = midnight, 0.5 = noon)
        this.dayDuration = 300; // seconds for a full day/night cycle
        this.lastUpdate = Date.now();
        
        // Create ambient light for day/night cycle
        this.ambientLight = new THREE.AmbientLight(0xffffff, 1);
        this.scene.add(this.ambientLight);
        
        // Create directional light for sun/moon
        this.sunLight = new THREE.DirectionalLight(0xffffff, 1);
        this.sunLight.position.set(0, 10, 0);
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
    
    update() {
        const now = Date.now();
        const delta = (now - this.lastUpdate) / 1000; // Convert to seconds
        this.lastUpdate = now;
        
        // Update time of day
        this.timeOfDay = (this.timeOfDay + delta / this.dayDuration) % 1;
        
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
} 