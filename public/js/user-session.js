/**
 * User Session Management
 * 
 * Handles user session display across all pages
 */

// Get current user from localStorage
function getCurrentUser() {
    // Try the new format first (single object)
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
        try {
            return JSON.parse(userStr);
        } catch (e) {
            console.error('Error parsing user data:', e);
        }
    }
    
    // Fall back to the existing format (separate keys)
    const userId = localStorage.getItem('bharatMandiUserId');
    const userName = localStorage.getItem('bharatMandiUserName');
    const userType = localStorage.getItem('bharatMandiUserType');
    
    if (userId && userName) {
        return {
            userId: userId,
            name: userName,
            userType: userType || 'User',
            role: userType || 'User'
        };
    }
    
    return null;
}

// Display user welcome message in header
function displayUserWelcome() {
    const user = getCurrentUser();
    const welcomeContainer = document.getElementById('userWelcome');
    
    if (!welcomeContainer) {
        return;
    }
    
    if (user && user.name) {
        let roleDisplay = user.userType || user.role || 'User';
        
        // Handle "both" role - display as "Farmer & Buyer"
        if (roleDisplay.toLowerCase() === 'both') {
            roleDisplay = 'Farmer & Buyer';
        }
        
        // Capitalize first letter if not already formatted
        if (roleDisplay !== 'Farmer & Buyer') {
            roleDisplay = roleDisplay.charAt(0).toUpperCase() + roleDisplay.slice(1);
        }
        
        welcomeContainer.innerHTML = `
            <div class="user-welcome">
                <span class="user-icon">👤</span>
                <div class="user-info">
                    <span class="user-name">Welcome, ${user.name}</span>
                    <span class="user-role">${roleDisplay}</span>
                </div>
            </div>
        `;
        welcomeContainer.style.display = 'flex';
    } else {
        welcomeContainer.style.display = 'none';
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', displayUserWelcome);

// Listen for storage changes (when user logs in/out in another tab)
window.addEventListener('storage', function(e) {
    if (e.key === 'currentUser' || e.key === 'bharatMandiUserName' || e.key === 'bharatMandiUserId') {
        displayUserWelcome();
    }
});

// Also listen for custom events from the same page
window.addEventListener('userLoggedIn', displayUserWelcome);
window.addEventListener('userLoggedOut', displayUserWelcome);
