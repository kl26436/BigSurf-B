// Stats UI Module - core/stats-ui.js
// Apple Health-style stats page with expandable sections

import { PRTracker } from './pr-tracker.js';
import { StreakTracker } from './streak-tracker.js';
import { setBottomNavVisible, navigateTo } from './navigation.js';
import { AppState } from './app-state.js';
import { FirebaseWorkoutManager } from './firebase-workout-manager.js';
import { db, collection, query, where, getDocs, orderBy } from './firebase-config.js';

// ===================================================================
// STATE
// ===================================================================

let statsData = {
    streaks: null,
    dayFrequency: null,
    quickStats: null,
    recentPRs: null,
    badges: null
};

let expandedSections = {
    streaks: false,
    quickStats: false,
    badges: false,
    prs: false
};

// ===================================================================
// STATS VIEW DISPLAY
// ===================================================================

/**
 * Show stats & records view
 */
export async function showStats() {
    const statsSection = document.getElementById('stats-section');
    if (!statsSection) {
        console.error('Stats section not found');
        return;
    }

    statsSection.classList.remove('hidden');

    // Hide bottom nav on stats (accessed from More menu)
    setBottomNavVisible(false);

    // Render stats view
    await renderStatsView();
}

/**
 * Close stats view
 */
export function closeStats() {
    const statsSection = document.getElementById('stats-section');
    if (statsSection) {
        statsSection.classList.add('hidden');
    }
    setBottomNavVisible(true);
    navigateTo('dashboard');
}

/**
 * Render complete stats view
 */
async function renderStatsView() {
    const container = document.getElementById('stats-content');
    if (!container) return;

    // Show loading
    container.innerHTML = `
        <div class="stats-loading">
            <div class="spinner"></div>
            <p>Loading your stats...</p>
        </div>
    `;

    try {
        // Load all stats data in parallel
        const [streaks, dayFrequency, quickStats, badges] = await Promise.all([
            StreakTracker.calculateStreaks(),
            StreakTracker.getWorkoutFrequencyByDay(),
            calculateQuickStats(),
            calculateBadges()
        ]);

        statsData = {
            streaks,
            dayFrequency,
            quickStats,
            badges,
            recentPRs: PRTracker.getRecentPRs(3)
        };

        container.innerHTML = `
            <div class="stats-header-bar">
                <button class="btn-back" onclick="closeStats()">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <h2>Stats & Records</h2>
                <div style="width: 40px;"></div>
            </div>

            <div class="stats-sections">
                ${renderStreaksSection()}
                ${renderQuickStatsSection()}
                ${renderBadgesSection()}
                ${renderPRsSection()}
            </div>
        `;

    } catch (error) {
        console.error('Error rendering stats:', error);
        container.innerHTML = `
            <div class="stats-header-bar">
                <button class="btn-back" onclick="closeStats()">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <h2>Stats & Records</h2>
                <div style="width: 40px;"></div>
            </div>
            <div class="stats-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading stats</p>
            </div>
        `;
    }
}

// ===================================================================
// STREAKS SECTION
// ===================================================================

function renderStreaksSection() {
    const stats = statsData.streaks;
    const isExpanded = expandedSections.streaks;

    if (!stats) {
        return `
            <div class="stats-card">
                <div class="stats-card-header" onclick="toggleStatsSection('streaks')">
                    <div class="stats-card-title">
                        <i class="fas fa-fire" style="color: #ff6b35;"></i>
                        <span>Streaks</span>
                    </div>
                    <span class="view-all-link">View All <i class="fas fa-chevron-right"></i></span>
                </div>
                <div class="stats-card-empty">
                    <p>No workout data yet</p>
                </div>
            </div>
        `;
    }

    return `
        <div class="stats-card ${isExpanded ? 'expanded' : ''}">
            <div class="stats-card-header" onclick="toggleStatsSection('streaks')">
                <div class="stats-card-title">
                    <i class="fas fa-fire" style="color: #ff6b35;"></i>
                    <span>Streaks</span>
                </div>
                <span class="view-all-link">${isExpanded ? 'Less' : 'View All'} <i class="fas fa-chevron-${isExpanded ? 'up' : 'right'}"></i></span>
            </div>

            <div class="stats-card-preview">
                <div class="streak-preview-grid">
                    <div class="streak-preview-item ${stats.currentStreak > 0 ? 'active' : ''}">
                        <div class="streak-preview-icon">
                            <i class="fas fa-fire"></i>
                        </div>
                        <div class="streak-preview-info">
                            <span class="streak-preview-value">${stats.currentStreak}</span>
                            <span class="streak-preview-label">Current Streak</span>
                        </div>
                    </div>
                    <div class="streak-preview-item">
                        <div class="streak-preview-icon trophy">
                            <i class="fas fa-trophy"></i>
                        </div>
                        <div class="streak-preview-info">
                            <span class="streak-preview-value">${stats.longestStreak}</span>
                            <span class="streak-preview-label">Longest Streak</span>
                        </div>
                    </div>
                </div>
            </div>

            ${isExpanded ? renderStreaksExpanded(stats) : ''}
        </div>
    `;
}

function renderStreaksExpanded(stats) {
    const dayFrequency = statsData.dayFrequency || [];
    const maxCount = Math.max(...dayFrequency.map(d => d.count), 1);

    return `
        <div class="stats-card-expanded">
            <div class="stats-mini-grid">
                <div class="stats-mini-item">
                    <i class="fas fa-dumbbell"></i>
                    <span class="stats-mini-value">${stats.totalWorkouts}</span>
                    <span class="stats-mini-label">Total Workouts</span>
                </div>
                <div class="stats-mini-item">
                    <i class="fas fa-calendar-week"></i>
                    <span class="stats-mini-value">${stats.workoutsThisWeek}</span>
                    <span class="stats-mini-label">This Week</span>
                </div>
                <div class="stats-mini-item">
                    <i class="fas fa-calendar-alt"></i>
                    <span class="stats-mini-value">${stats.workoutsThisMonth}</span>
                    <span class="stats-mini-label">This Month</span>
                </div>
            </div>

            ${dayFrequency.length > 0 ? `
                <div class="frequency-chart">
                    <h4>Workout Frequency</h4>
                    <div class="frequency-bars">
                        ${dayFrequency.map(({ day, count }) => {
                            const percentage = (count / maxCount) * 100;
                            return `
                                <div class="frequency-bar-item">
                                    <div class="frequency-bar-track">
                                        <div class="frequency-bar-fill" style="height: ${percentage}%;"></div>
                                    </div>
                                    <div class="frequency-day">${day.slice(0, 1)}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

// ===================================================================
// QUICK STATS SECTION
// ===================================================================

function renderQuickStatsSection() {
    const stats = statsData.quickStats;
    const isExpanded = expandedSections.quickStats;

    if (!stats) {
        return `
            <div class="stats-card">
                <div class="stats-card-header" onclick="toggleStatsSection('quickStats')">
                    <div class="stats-card-title">
                        <i class="fas fa-chart-bar" style="color: var(--primary);"></i>
                        <span>Quick Stats</span>
                    </div>
                    <span class="view-all-link">View All <i class="fas fa-chevron-right"></i></span>
                </div>
                <div class="stats-card-empty">
                    <p>Complete workouts to see stats</p>
                </div>
            </div>
        `;
    }

    return `
        <div class="stats-card ${isExpanded ? 'expanded' : ''}">
            <div class="stats-card-header" onclick="toggleStatsSection('quickStats')">
                <div class="stats-card-title">
                    <i class="fas fa-chart-bar" style="color: var(--primary);"></i>
                    <span>Quick Stats</span>
                </div>
                <span class="view-all-link">${isExpanded ? 'Less' : 'View All'} <i class="fas fa-chevron-${isExpanded ? 'up' : 'right'}"></i></span>
            </div>

            <div class="quick-stats-preview">
                <div class="quick-stat-item">
                    <span class="quick-stat-label">Most Active Day</span>
                    <span class="quick-stat-value">${stats.mostActiveDay || 'N/A'}</span>
                </div>
                <div class="quick-stat-divider"></div>
                <div class="quick-stat-item">
                    <span class="quick-stat-label">Top Location</span>
                    <span class="quick-stat-value">${truncateText(stats.topLocation || 'N/A', 15)}</span>
                </div>
            </div>

            ${isExpanded ? renderQuickStatsExpanded(stats) : ''}
        </div>
    `;
}

function renderQuickStatsExpanded(stats) {
    return `
        <div class="stats-card-expanded">
            <div class="expanded-stat-row">
                <div class="expanded-stat-icon">
                    <i class="fas fa-dumbbell"></i>
                </div>
                <div class="expanded-stat-info">
                    <span class="expanded-stat-label">Favorite Workout</span>
                    <span class="expanded-stat-value">${stats.favoriteWorkout || 'N/A'}</span>
                </div>
                <span class="expanded-stat-count">${stats.favoriteWorkoutCount || 0}x</span>
            </div>

            ${stats.locationBreakdown && stats.locationBreakdown.length > 0 ? `
                <div class="location-breakdown">
                    <h4>Workouts by Location</h4>
                    ${stats.locationBreakdown.slice(0, 5).map(loc => `
                        <div class="location-breakdown-row">
                            <i class="fas fa-map-marker-alt"></i>
                            <span class="location-name">${loc.name}</span>
                            <span class="location-count">${loc.count} workout${loc.count !== 1 ? 's' : ''}</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            <div class="expanded-stat-row">
                <div class="expanded-stat-icon">
                    <i class="fas fa-clock"></i>
                </div>
                <div class="expanded-stat-info">
                    <span class="expanded-stat-label">Average Workout</span>
                    <span class="expanded-stat-value">${stats.avgDuration || 'N/A'}</span>
                </div>
            </div>
        </div>
    `;
}

// ===================================================================
// BADGES SECTION
// ===================================================================

function renderBadgesSection() {
    const badges = statsData.badges;
    const isExpanded = expandedSections.badges;

    const earnedBadges = badges ? badges.filter(b => b.earned) : [];
    const unearnedBadges = badges ? badges.filter(b => !b.earned) : [];

    return `
        <div class="stats-card ${isExpanded ? 'expanded' : ''}">
            <div class="stats-card-header" onclick="toggleStatsSection('badges')">
                <div class="stats-card-title">
                    <i class="fas fa-medal" style="color: #ffd700;"></i>
                    <span>Badges</span>
                    ${earnedBadges.length > 0 ? `<span class="badge-count">${earnedBadges.length}</span>` : ''}
                </div>
                <span class="view-all-link">${isExpanded ? 'Less' : 'View All'} <i class="fas fa-chevron-${isExpanded ? 'up' : 'right'}"></i></span>
            </div>

            <div class="badges-preview">
                ${earnedBadges.length > 0 ? `
                    <div class="badges-row">
                        ${earnedBadges.slice(0, 5).map(badge => `
                            <div class="badge-item earned" title="${badge.name}">
                                <i class="${badge.icon}"></i>
                            </div>
                        `).join('')}
                        ${earnedBadges.length > 5 ? `<span class="badges-more">+${earnedBadges.length - 5}</span>` : ''}
                    </div>
                ` : `
                    <p class="badges-empty">Complete workouts to earn badges!</p>
                `}
            </div>

            ${isExpanded ? renderBadgesExpanded(earnedBadges, unearnedBadges) : ''}
        </div>
    `;
}

function renderBadgesExpanded(earned, unearned) {
    return `
        <div class="stats-card-expanded">
            ${earned.length > 0 ? `
                <div class="badges-section">
                    <h4>Earned</h4>
                    <div class="badges-grid">
                        ${earned.map(badge => `
                            <div class="badge-card earned">
                                <div class="badge-icon">
                                    <i class="${badge.icon}"></i>
                                </div>
                                <span class="badge-name">${badge.name}</span>
                                <span class="badge-desc">${badge.description}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            ${unearned.length > 0 ? `
                <div class="badges-section">
                    <h4>In Progress</h4>
                    <div class="badges-grid">
                        ${unearned.slice(0, 6).map(badge => `
                            <div class="badge-card locked">
                                <div class="badge-icon">
                                    <i class="${badge.icon}"></i>
                                </div>
                                <span class="badge-name">${badge.name}</span>
                                <span class="badge-progress">${badge.progress || ''}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

// ===================================================================
// PRS SECTION
// ===================================================================

function renderPRsSection() {
    const recentPRs = statsData.recentPRs || [];
    const isExpanded = expandedSections.prs;
    const totalPRCount = PRTracker.getTotalPRCount();

    return `
        <div class="stats-card ${isExpanded ? 'expanded' : ''}">
            <div class="stats-card-header" onclick="toggleStatsSection('prs')">
                <div class="stats-card-title">
                    <i class="fas fa-trophy" style="color: #ffd700;"></i>
                    <span>Personal Records</span>
                    ${totalPRCount > 0 ? `<span class="badge-count">${totalPRCount}</span>` : ''}
                </div>
                <span class="view-all-link">${isExpanded ? 'Less' : 'View All'} <i class="fas fa-chevron-${isExpanded ? 'up' : 'right'}"></i></span>
            </div>

            ${recentPRs.length > 0 ? `
                <div class="prs-preview">
                    ${recentPRs.map(pr => `
                        <div class="pr-preview-row">
                            <div class="pr-preview-info">
                                <span class="pr-preview-exercise">${pr.exercise}</span>
                                <span class="pr-preview-equipment">${pr.equipment}</span>
                            </div>
                            <div class="pr-preview-value">
                                <span class="pr-weight">${pr.weight}</span>
                                <span class="pr-unit">lbs</span>
                                <span class="pr-reps">x ${pr.reps}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : `
                <div class="stats-card-empty">
                    <p>No PRs recorded yet</p>
                    <p class="stats-hint">PRs tracked from ${formatDate(PRTracker.getPRCutoffDate())}</p>
                </div>
            `}

            ${isExpanded ? renderPRsExpanded() : ''}
        </div>
    `;
}

function renderPRsExpanded() {
    const prsByBodyPart = PRTracker.getPRsByBodyPart();
    const bodyParts = Object.keys(prsByBodyPart).sort();

    if (bodyParts.length === 0) {
        return `
            <div class="stats-card-expanded">
                <p class="stats-card-empty">Complete workouts to start tracking PRs</p>
            </div>
        `;
    }

    return `
        <div class="stats-card-expanded pr-browser">
            ${bodyParts.map(bodyPart => {
                const exercises = prsByBodyPart[bodyPart];
                const exerciseCount = Object.keys(exercises).length;

                return `
                    <div class="pr-body-part-group">
                        <div class="pr-body-part-header" onclick="togglePRBodyPart('${bodyPart}')">
                            <span class="pr-body-part-name">${bodyPart}</span>
                            <span class="pr-body-part-count">${exerciseCount} exercise${exerciseCount !== 1 ? 's' : ''}</span>
                            <i class="fas fa-chevron-down pr-expand-icon"></i>
                        </div>
                        <div class="pr-body-part-content" id="pr-group-${bodyPart.replace(/\s+/g, '-')}">
                            ${Object.entries(exercises).map(([exerciseName, equipmentPRs]) => `
                                <div class="pr-exercise-group">
                                    <div class="pr-exercise-name">${exerciseName}</div>
                                    ${Object.entries(equipmentPRs).map(([equipment, prs]) => `
                                        <div class="pr-equipment-row">
                                            <span class="pr-equipment-name">${equipment}</span>
                                            <span class="pr-equipment-value">${prs.maxWeight?.weight || 0} lbs x ${prs.maxWeight?.reps || 0}</span>
                                            <span class="pr-equipment-date">${formatDateShort(prs.maxWeight?.date)}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// ===================================================================
// QUICK STATS CALCULATION
// ===================================================================

async function calculateQuickStats() {
    if (!AppState.currentUser) return null;

    try {
        const workoutsRef = collection(db, 'users', AppState.currentUser.uid, 'workouts');
        const q = query(
            workoutsRef,
            where('completedAt', '!=', null),
            orderBy('completedAt', 'desc')
        );

        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;

        const workouts = [];
        snapshot.forEach(doc => workouts.push({ id: doc.id, ...doc.data() }));

        // Calculate most active day
        const dayCount = {};
        const locationCount = {};
        const workoutTypeCount = {};
        let totalDuration = 0;

        workouts.forEach(workout => {
            // Day of week
            if (workout.completedAt) {
                const date = new Date(workout.completedAt);
                const day = date.toLocaleDateString('en-US', { weekday: 'long' });
                dayCount[day] = (dayCount[day] || 0) + 1;
            }

            // Location
            if (workout.location) {
                locationCount[workout.location] = (locationCount[workout.location] || 0) + 1;
            }

            // Workout type
            if (workout.workoutType) {
                workoutTypeCount[workout.workoutType] = (workoutTypeCount[workout.workoutType] || 0) + 1;
            }

            // Duration
            if (workout.totalDuration) {
                totalDuration += workout.totalDuration;
            }
        });

        // Find most active day
        const mostActiveDay = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0];

        // Find top location
        const topLocation = Object.entries(locationCount).sort((a, b) => b[1] - a[1])[0];

        // Find favorite workout
        const favoriteWorkout = Object.entries(workoutTypeCount).sort((a, b) => b[1] - a[1])[0];

        // Location breakdown
        const locationBreakdown = Object.entries(locationCount)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

        // Average duration
        const avgDurationMins = workouts.length > 0 ? Math.round((totalDuration / workouts.length) / 60) : 0;

        return {
            mostActiveDay: mostActiveDay ? mostActiveDay[0] : null,
            topLocation: topLocation ? topLocation[0] : null,
            topLocationCount: topLocation ? topLocation[1] : 0,
            favoriteWorkout: favoriteWorkout ? favoriteWorkout[0] : null,
            favoriteWorkoutCount: favoriteWorkout ? favoriteWorkout[1] : 0,
            locationBreakdown,
            avgDuration: avgDurationMins > 0 ? `${avgDurationMins} min` : null,
            totalWorkouts: workouts.length
        };

    } catch (error) {
        console.error('Error calculating quick stats:', error);
        return null;
    }
}

// ===================================================================
// BADGES CALCULATION
// ===================================================================

async function calculateBadges() {
    const stats = statsData.streaks;
    const prCount = PRTracker.getTotalPRCount();

    // Get workout manager for location count
    const workoutManager = new FirebaseWorkoutManager(AppState);
    const locations = await workoutManager.getUserLocations();
    const locationCount = locations.length;

    // Define all badges
    const allBadges = [
        {
            id: 'first-workout',
            name: 'First Workout',
            description: 'Completed your first workout',
            icon: 'fas fa-star',
            check: () => stats && stats.totalWorkouts >= 1
        },
        {
            id: 'streak-7',
            name: '7-Day Streak',
            description: 'Worked out 7 days in a row',
            icon: 'fas fa-fire',
            check: () => stats && stats.longestStreak >= 7,
            progress: stats ? `${Math.min(stats.longestStreak, 7)}/7 days` : '0/7 days'
        },
        {
            id: 'streak-30',
            name: '30-Day Streak',
            description: 'Worked out 30 days in a row',
            icon: 'fas fa-fire-alt',
            check: () => stats && stats.longestStreak >= 30,
            progress: stats ? `${Math.min(stats.longestStreak, 30)}/30 days` : '0/30 days'
        },
        {
            id: 'workouts-10',
            name: '10 Workouts',
            description: 'Completed 10 workouts',
            icon: 'fas fa-dumbbell',
            check: () => stats && stats.totalWorkouts >= 10,
            progress: stats ? `${Math.min(stats.totalWorkouts, 10)}/10` : '0/10'
        },
        {
            id: 'workouts-50',
            name: '50 Workouts',
            description: 'Completed 50 workouts',
            icon: 'fas fa-medal',
            check: () => stats && stats.totalWorkouts >= 50,
            progress: stats ? `${Math.min(stats.totalWorkouts, 50)}/50` : '0/50'
        },
        {
            id: 'workouts-100',
            name: '100 Workouts',
            description: 'Completed 100 workouts',
            icon: 'fas fa-crown',
            check: () => stats && stats.totalWorkouts >= 100,
            progress: stats ? `${Math.min(stats.totalWorkouts, 100)}/100` : '0/100'
        },
        {
            id: 'prs-10',
            name: 'PR Hunter',
            description: 'Set 10 personal records',
            icon: 'fas fa-trophy',
            check: () => prCount >= 10,
            progress: `${Math.min(prCount, 10)}/10 PRs`
        },
        {
            id: 'prs-50',
            name: 'Record Breaker',
            description: 'Set 50 personal records',
            icon: 'fas fa-award',
            check: () => prCount >= 50,
            progress: `${Math.min(prCount, 50)}/50 PRs`
        },
        {
            id: 'locations-5',
            name: 'Explorer',
            description: 'Worked out at 5 different locations',
            icon: 'fas fa-map-marker-alt',
            check: () => locationCount >= 5,
            progress: `${Math.min(locationCount, 5)}/5 locations`
        }
    ];

    return allBadges.map(badge => ({
        ...badge,
        earned: badge.check()
    }));
}

// ===================================================================
// SECTION TOGGLE
// ===================================================================

export function toggleStatsSection(section) {
    expandedSections[section] = !expandedSections[section];
    renderStatsView();
}

export function togglePRBodyPart(bodyPart) {
    const groupId = `pr-group-${bodyPart.replace(/\s+/g, '-')}`;
    const group = document.getElementById(groupId);
    const header = group?.previousElementSibling;

    if (group) {
        group.classList.toggle('collapsed');
        header?.classList.toggle('collapsed');
    }
}

// ===================================================================
// HELPERS
// ===================================================================

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateOnly = date.toISOString().split('T')[0];
    const todayOnly = today.toISOString().split('T')[0];
    const yesterdayOnly = yesterday.toISOString().split('T')[0];

    if (dateOnly === todayOnly) return 'Today';
    if (dateOnly === yesterdayOnly) return 'Yesterday';

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateShort(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
}

function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Legacy exports for compatibility
export function filterPRs() {}
export function clearPRFilters() {}
