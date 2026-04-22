const SAVE_KEY = 'potato_brothers_save';
const SETTINGS_KEY = 'potato_brothers_settings';

class SaveSystem {
    static saveGame(gameState) {
        try {
            const saveData = {
                currentLevel: gameState.currentLevel,
                playerHealth: gameState.playerHealth,
                playerCoins: gameState.playerCoins,
                playerMaxHealth: gameState.playerMaxHealth,
                difficulty: gameState.difficulty,
                timestamp: Date.now()
            };
            localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
            return true;
        } catch (e) {
            console.warn('Failed to save game:', e);
            return false;
        }
    }

    static loadGame() {
        try {
            const data = localStorage.getItem(SAVE_KEY);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.warn('Failed to load game:', e);
            return null;
        }
    }

    static hasSave() {
        try {
            return localStorage.getItem(SAVE_KEY) !== null;
        } catch (e) {
            return false;
        }
    }

    static deleteSave() {
        try {
            localStorage.removeItem(SAVE_KEY);
        } catch (e) {
            console.warn('Failed to delete save:', e);
        }
    }

    static saveSettings(settings) {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
            return true;
        } catch (e) {
            console.warn('Failed to save settings:', e);
            return false;
        }
    }

    static loadSettings() {
        try {
            const data = localStorage.getItem(SETTINGS_KEY);
            return data ? JSON.parse(data) : {
                musicVolume: 0.7,
                sfxVolume: 0.8,
                difficulty: 'NORMAL'
            };
        } catch (e) {
            return {
                musicVolume: 0.7,
                sfxVolume: 0.8,
                difficulty: 'NORMAL'
            };
        }
    }
}

window.SaveSystem = SaveSystem;