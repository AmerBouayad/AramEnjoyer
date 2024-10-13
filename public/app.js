// Importer les fonctions nécessaires de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-app.js";
import { getFirestore, collection, deleteDoc, updateDoc, doc, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-firestore.js";

// Votre configuration Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCjKxy_s43iLSZx-JHgSf0-jQo1ToGzKE0",
    authDomain: "aramenjoyer-f086f.firebaseapp.com",
    projectId: "aramenjoyer-f086f",
    storageBucket: "aramenjoyer-f086f.appspot.com",
    messagingSenderId: "509841631995",
    appId: "1:509841631995:web:4437dae970a27db0b8de5e"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', () => {
    const sessionList = document.getElementById('sessionList');
    const errorMessage = document.getElementById('errorMessage');
    const usernameInput = document.getElementById('username');
    const newSessionTimeSelect = document.getElementById('newSessionTime');
    const createSessionBtn = document.getElementById('createSessionBtn');
    const resetCountdown = document.getElementById('resetCountdown');

    let sessions = [];

    function populateSessionTime() {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinutes = now.getMinutes();
        const sessionTimeSelect = newSessionTimeSelect;
    
        // Clear previous options
        sessionTimeSelect.innerHTML = '';
    
        // Populate available hours for today and tomorrow
        for (let hour = currentHour; hour < 24; hour++) {
            if (hour === currentHour && currentMinutes >= 30) {
                continue; // Skip the current hour if minutes are past 30
            }
            
            // Add full hour option
            if (!(hour === currentHour && currentMinutes >= 0 && currentMinutes < 30)) {
                const option1 = document.createElement('option');
                option1.value = `${hour}:00`;
                option1.innerText = `${hour}:00`;
                sessionTimeSelect.appendChild(option1);
            }
    
            // Add half-hour option
            if (!(hour === currentHour && currentMinutes >= 30)) {
                const option2 = document.createElement('option');
                option2.value = `${hour}:30`;
                option2.innerText = `${hour}:30`;
                sessionTimeSelect.appendChild(option2);
            }
        }
    
        // Add options for tomorrow
        for (let hour = 0; hour < 6; hour++) {
            const option1 = document.createElement('option');
            option1.value = `Demain ${hour}:00`;
            option1.innerText = `Demain ${hour}:00`;
            sessionTimeSelect.appendChild(option1);
    
            const option2 = document.createElement('option');
            option2.value = `Demain ${hour}:30`;
            option2.innerText = `Demain ${hour}:30`;
            sessionTimeSelect.appendChild(option2);
        }
    
        // Set default value to the next available time
        if (currentHour < 6) {
            sessionTimeSelect.value = '0:00'; // Première heure disponible
        } else if (currentHour >= 6 && currentMinutes >= 30) {
            sessionTimeSelect.value = `${currentHour + 1}:00`; // Prochaine heure pleine
        } else {
            sessionTimeSelect.value = `${currentHour}:${currentMinutes >= 30 ? '00' : '30'}`; // Prochaine heure
        }
    }

    // Create new session
    createSessionBtn.addEventListener('click', async () => {
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
                time: newSessionTime,
                players: [{ username }], // Ajoutez le joueur comme un objet avec un champ `username`
                expiration: sessionStartTime.getTime() + 30 * 60 * 1000,
                creator: username,
                createdAt: serverTimestamp()
            };

            try {
                const docRef = await addDoc(collection(db, "sessions"), newSession);
                console.log("Session ajoutée avec l'ID: ", docRef.id);
                sessions.push({ ...newSession, id: docRef.id });
                renderSessions();  // Rendre les sessions après la création
                clearError();
                startSessionCountdown(newSession, sessionStartTime);  // Démarrer le compte à rebours après la création
            } catch (e) {
                console.error("Erreur lors de l'ajout de la session: ", e);
            }
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
                                ${player.username}  <!-- Assurez-vous que player est un objet avec un champ username -->
                                <button class="btn btn-danger btn-sm leave-btn" onclick="leaveSession('${session.id}', '${player.username}')">Leave</button>
                            </li>`
                        )
                        .join('')}
                </ul>
                <div id="countdown-${session.id}" class="text-center"></div> <!-- Compteur en bas -->
            `;

            sessionList.appendChild(sessionItem);
            // Démarrer le compte à rebours pour chaque session rendue
            startSessionCountdown(session, new Date(`${new Date().toISOString().split('T')[0]}T${session.time}`));
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
                
                // Vérifiez si le temps jusqu'à l'ouverture est inférieur ou égal à 30 minutes
                if (timeUntilStart <= 30) {
                    countdownElement.innerHTML = `<span style="color: green;">Ouvre dans ${timeUntilStart}m</span>`;
                } else {
                    countdownElement.innerHTML = ''; // Clear countdown if more than 30 minutes to start
                }
            } else {
                const remainingTime = session.expiration - now;
                if (remainingTime <= 0) {
                    clearInterval(intervalId);
                    removeSession(session.id);
                } else {
                    const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
                    
                    // N'afficher que si la suppression est dans 30 minutes ou moins
                    if (minutes <= 30) {
                        countdownElement.innerHTML = `<span style="color: red;">Supprimé dans ${minutes}m</span>`;
                    } else {
                        countdownElement.innerHTML = ''; // Ne rien afficher si le temps restant est supérieur à 30 minutes
                    }
                }
            }
        }, 1000);
    }  
    
    // Remove session
    async function removeSession(sessionId) {
        try {
            await deleteDoc(doc(db, "sessions", sessionId));
            console.log("Session supprimée de Firestore");
            sessions = sessions.filter(session => session.id !== sessionId);
            renderSessions();
        } catch (e) {
            console.error("Erreur lors de la suppression de la session: ", e);
        }
    }

    window.joinSession = async function (sessionId) {
        const session = sessions.find((s) => s.id === sessionId);
        const username = usernameInput.value;
        
        if (!username) {
            showError('Veuillez entrer un pseudo pour rejoindre une session');
        } else if (session.players.length < 5) {
            // Check if the username is already in the session
            if (session.players.some(player => player.username === username)) {
                showError('Ce pseudo est déjà utilisé dans cette session');
            } else {
                session.players.push({ username }); // Ajouter le joueur localement
    
                // Mettre à jour Firestore
                try {
                    const sessionDocRef = doc(db, "sessions", sessionId);
                    await updateDoc(sessionDocRef, {
                        players: session.players // Met à jour la liste des joueurs dans Firestore
                    });
                    renderSessions();  // Re-render les sessions après la mise à jour
                    clearError();
                } catch (e) {
                    console.error("Erreur lors de la mise à jour des joueurs dans Firestore : ", e);
                }
            }
        } else {
            showError('La session est pleine');
        }
    };
    
    window.leaveSession = async function (sessionId, playerUsername) {
        const session = sessions.find((s) => s.id === sessionId);
        
        // Supprimer le joueur de la liste localement
        session.players = session.players.filter((player) => player.username !== playerUsername);
    
        if (session.players.length === 0) {
            // Si plus aucun joueur dans la session, la supprimer
            try {
                const sessionDocRef = doc(db, "sessions", sessionId);
                await deleteDoc(sessionDocRef); // Supprime la session de Firestore
                console.log("Session supprimée car il n'y a plus de joueurs");
                sessions = sessions.filter((s) => s.id !== sessionId); // Supprimer la session localement
                renderSessions(); // Rafraîchir l'affichage
            } catch (e) {
                console.error("Erreur lors de la suppression de la session: ", e);
            }
        } else {
            // Sinon, juste mettre à jour la liste des joueurs
            try {
                const sessionDocRef = doc(db, "sessions", sessionId);
                await updateDoc(sessionDocRef, {
                    players: session.players // Mettre à jour Firestore avec la nouvelle liste des joueurs
                });
                renderSessions();  // Rafraîchir l'affichage
            } catch (e) {
                console.error("Erreur lors de la mise à jour des joueurs dans Firestore : ", e);
            }
        }
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

    async function loadSessions() {
        const q = query(collection(db, "sessions"), orderBy("createdAt", "desc"), limit(10)); // Récupère les 10 dernières sessions
        
        try {
            const querySnapshot = await getDocs(q);
            sessions = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            renderSessions(); // Affiche les sessions récupérées
        } catch (e) {
            console.error("Erreur lors de la récupération des sessions: ", e);
        }
    }    

    // Reset all sessions
    function resetSessions() {
        sessions = [];
        renderSessions();
    }

    // Initial function calls
    populateSessionTime();
    startResetCountdown();
    loadSessions(); // Charger les sessions existantes
});