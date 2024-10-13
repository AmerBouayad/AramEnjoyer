document.addEventListener('DOMContentLoaded', () => {
    const sessionList = document.getElementById('sessionList');
    const errorMessage = document.getElementById('errorMessage');
    const usernameInput = document.getElementById('username');
    const newSessionTimeSelect = document.getElementById('newSessionTime');
    const createSessionBtn = document.getElementById('createSessionBtn');
    const resetCountdown = document.getElementById('resetCountdown');

    let sessions = [];

    // Populate session time select with only available future times until 6am
    function populateSessionTime() {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinutes = now.getMinutes();

        // Clear previous options
        newSessionTimeSelect.innerHTML = '';

        // Set the starting hour
        let startHour = currentHour;
        let startMinute = currentMinutes >= 30 ? 30 : 0;

        // If it's 30 minutes past the hour, move to the next hour
        if (currentMinutes >= 30) {
            startHour += 1;
            startMinute = 0;
        }

        // Fill the select with available times until 6am
        for (let hour = startHour; hour < 6; hour++) {
            const option1 = document.createElement('option');
            option1.value = `${hour}:00`;
            option1.innerText = `${hour}:00`;
            newSessionTimeSelect.appendChild(option1);

            const option2 = document.createElement('option');
            option2.value = `${hour}:30`;
            option2.innerText = `${hour}:30`;
            newSessionTimeSelect.appendChild(option2);
        }

        // Add the 6:00 AM option
        const option6am = document.createElement('option');
        option6am.value = '6:00';
        option6am.innerText = '6:00';
        newSessionTimeSelect.appendChild(option6am);
        
        // Set default value to the next available time
        if (startHour < 6) {
            newSessionTimeSelect.value = `${startHour}:${startMinute}`;
        } else {
            newSessionTimeSelect.value = '6:00'; // if the current time is 6 or later
        }
    }

    // Create new session
    createSessionBtn.addEventListener('click', () => {
        const username = usernameInput.value;
        const newSessionTime = newSessionTimeSelect.value;

        if (!newSessionTime) {
            showError('Veuillez entrer une heure pour créer une session');
        } else if (!username) {
            showError('Veuillez entrer un pseudo pour créer une session');
        } else if (isSessionTimeTaken(newSessionTime)) {
            showError('Une session existe déjà à cette heure');
        } else {
            const sessionStartTime = new Date(`${new Date().toDateString()} ${newSessionTime}`);
            const newSession = {
                id: Math.random().toString(),
                time: newSessionTime,
                players: [{ id: Math.random().toString(), username }],
                expiration: sessionStartTime.getTime() + 30 * 60 * 1000, // 30 minutes from the session time
                creator: username, // Store the creator's username
            };
            sessions.push(newSession);
            renderSessions();  // Rendre les sessions après la création
            clearError();
            startSessionCountdown(newSession, sessionStartTime);  // Démarrer le compte à rebours après la création
        }
    });

    // Render the session list
    function renderSessions() {
        sessionList.innerHTML = '';

        sessions.forEach((session) => {
            const sessionItem = document.createElement('div');
            sessionItem.className = 'session-card';

            sessionItem.innerHTML = `
                <div class="session-header text-center">
                    <strong>Session de ${session.creator}</strong>
                    <div>${session.time}</div>
                    <span>${session.players.length}/5</span>
                    <button class="btn btn-primary btn-sm join-btn" onclick="joinSession('${session.id}')">Join</button>
                </div>
                <ul class="list-group mt-3">
                    ${session.players
                        .map(
                            (player) => `
                            <li class="list-group-item d-flex justify-content-between align-items-center">
                                ${player.username}
                                <button class="btn btn-danger btn-sm leave-btn" onclick="leaveSession('${session.id}', '${player.id}')">Leave</button>
                            </li>`
                        )
                        .join('')}
                </ul>
                <div id="countdown-${session.id}" class="text-center"></div> <!-- Compteur en bas -->
            `;

            sessionList.appendChild(sessionItem);
            // Démarrer le compte à rebours pour chaque session rendue
            startSessionCountdown(session, new Date(`${new Date().toDateString()} ${session.time}`)); 
        });
    }

    // Check if session time is already taken
    function isSessionTimeTaken(sessionTime) {
        return sessions.some(session => session.time === sessionTime);
    }

    // Start countdown for session removal
    function startSessionCountdown(session, sessionStartTime) {
        const countdownElement = document.getElementById(`countdown-${session.id}`);
        const intervalId = setInterval(() => {
            const now = Date.now();
            
            if (now < sessionStartTime.getTime()) {
                const timeUntilStart = Math.ceil((sessionStartTime.getTime() - now) / 1000 / 60); // Convertir en minutes
                
                // Vérifiez si le temps jusqu'à l'ouverture est inférieur ou égal à 10 minutes
                if (timeUntilStart <= 30) {
                    countdownElement.innerHTML = `<span style="color: green;">Ouvre dans ${timeUntilStart}m</span>`;
                }
            } else {
                const remainingTime = session.expiration - now;
                if (remainingTime <= 0) {
                    clearInterval(intervalId);
                    removeSession(session.id);
                } else {
                    const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
                    countdownElement.innerHTML = `<span style="color: red;">Supprimé dans ${minutes}m</span>`;
                }
            }
        }, 1000);
    }    

    // Remove session
    function removeSession(sessionId) {
        sessions = sessions.filter(session => session.id !== sessionId);
        renderSessions();
    }

    // Join a session
    window.joinSession = function (sessionId) {
        const session = sessions.find((s) => s.id === sessionId);
        const username = usernameInput.value;

        if (!username) {
            showError('Veuillez entrer un pseudo pour rejoindre une session');
        } else if (session.players.length < 5) {
            // Check if the username is already in the session
            if (session.players.some(player => player.username === username)) {
                showError('Ce pseudo est déjà utilisé dans cette session');
            } else {
                session.players.push({ id: Math.random().toString(), username });
                renderSessions();  // Rendre les sessions après avoir rejoint
                clearError();
                startSessionCountdown(session, new Date(`${new Date().toDateString()} ${session.time}`));  // Démarrer le compte à rebours
            }
        } else {
            showError('La session est pleine');
        }
    };

    // Leave a session
    window.leaveSession = function (sessionId, playerId) {
        const session = sessions.find((s) => s.id === sessionId);
        session.players = session.players.filter((player) => player.id !== playerId);

        if (session.players.length === 0) {
            sessions = sessions.filter((s) => s.id !== sessionId);
        }

        renderSessions();
    };

    // Show error message
    function showError(message) {
        errorMessage.innerText = message;
        errorMessage.classList.remove('d-none');
    }

    // Clear error message
    function clearError() {
        errorMessage.classList.add('d-none');
    }

    // Countdown to reset sessions at 6:00 AM
    function startResetCountdown() {
        const now = new Date();
        const resetTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 0, 0);
        if (now > resetTime) {
            resetTime.setDate(resetTime.getDate() + 1); // Set to next day if it's already past 6 AM
        }

        const countdownElement = document.getElementById('resetCountdown');
        const intervalId = setInterval(() => {
            const remainingTime = resetTime - Date.now();
            if (remainingTime <= 0) {
                clearInterval(intervalId);
                resetSessions();
            } else {
                const hours = Math.floor((remainingTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((remainingTime % (1000 * 60)) / 1000);
                countdownElement.innerText = `Réinitialisation dans ${hours}h ${minutes}m ${seconds}s`;
            }
        }, 1000);
    }

    // Reset all sessions
    function resetSessions() {
        sessions = [];
        renderSessions();
    }

    // Initial function calls
    populateSessionTime();
    startResetCountdown();
});
