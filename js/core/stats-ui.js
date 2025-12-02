// Stats UI Module - core/stats-ui.js
// Stats page matching the mockup design

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
    insights: null,
    badges: null,
    recentPRs: null
};

let expandedSections = {
    insights: false,
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
    setBottomNavVisible(true); // Keep bottom nav visible for consistency
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

    container.innerHTML = `
        <div class="stats-loading">
            <div class="spinner"></div>
            <p>Loading your stats...</p>
        </div>
    `;

    try {
        const [streaks, insights, badges] = await Promise.all([
            StreakTracker.calculateStreaks(),
            calculateInsights(),
            calculateBadges()
        ]);

        statsData = {
            streaks,
            insights,
            badges,
            recentPRs: PRTracker.getRecentPRs(5)
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
                ${renderStreakBoxes()}
                ${renderInsightsSection()}
                ${renderBadgesSection()}
                ${renderRecentPRsSection()}
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
// STREAK BOXES (Top Row - 3 boxes)
// ===================================================================

function renderStreakBoxes() {
    const stats = statsData.streaks || { currentStreak: 0, longestStreak: 0, totalWorkouts: 0 };

    return `
        <div class="stats-streak-row">
            <div class="streak-box ${stats.currentStreak > 0 ? 'active' : ''}">
                <div class="streak-box-icon fire">
                    <i class="fas fa-fire"></i>
                </div>
                <div class="streak-box-label">CURRENT STREAK</div>
                <div class="streak-box-value">${stats.currentStreak} days</div>
            </div>
            <div class="streak-box">
                <div class="streak-box-icon trophy">
                    <i class="fas fa-trophy"></i>
                </div>
                <div class="streak-box-label">LONGEST STREAK</div>
                <div class="streak-box-value">${stats.longestStreak} days</div>
            </div>
            <div class="streak-box">
                <div class="streak-box-icon total">
                    <i class="fas fa-dumbbell"></i>
                </div>
                <div class="streak-box-label">TOTAL WORKOUTS</div>
                <div class="streak-box-value">${stats.totalWorkouts}</div>
            </div>
        </div>
    `;
}

// ===================================================================
// INSIGHTS SECTION (2x2 Grid)
// ===================================================================

function renderInsightsSection() {
    const insights = statsData.insights || {};
    const isExpanded = expandedSections.insights;

    return `
        <div class="stats-section-header" onclick="toggleStatsSection('insights')">
            <span class="stats-section-title">Insights</span>
            <span class="view-more-link">${isExpanded ? 'Less' : 'View More'}</span>
        </div>

        <div class="insights-grid">
            <div class="insight-box">
                <div class="insight-label">Day of Week</div>
                <div class="insight-value">${insights.topDays || 'N/A'}</div>
            </div>
            <div class="insight-box">
                <div class="insight-label">Time of Day</div>
                <div class="insight-value">${insights.timeOfDay || 'N/A'}</div>
            </div>
            <div class="insight-box">
                <div class="insight-label">Most Used Location</div>
                <div class="insight-value location">
                    <i class="fas fa-map-marker-alt"></i>
                    ${insights.topLocation || 'N/A'}
                </div>
            </div>
            <div class="insight-box">
                <div class="insight-label">Most Used Workout</div>
                <div class="insight-value">${insights.topWorkout || 'N/A'}</div>
            </div>
            ${isExpanded ? `
            <div class="insight-box">
                <div class="insight-label">Total Volume This Month</div>
                <div class="insight-value">${insights.totalVolume || 'N/A'}</div>
            </div>
            <div class="insight-box">
                <div class="insight-label">Avg Duration</div>
                <div class="insight-value">${insights.avgDuration || 'N/A'}</div>
            </div>
            ` : ''}
        </div>
    `;
}

function renderInsightsExpanded(insights) {
    return `
        <div class="insights-expanded">
            ${insights.locationBreakdown && insights.locationBreakdown.length > 0 ? `
                <div class="expanded-section">
                    <h4>Workouts by Location</h4>
                    ${insights.locationBreakdown.slice(0, 5).map(loc => `
                        <div class="breakdown-row">
                            <i class="fas fa-map-marker-alt"></i>
                            <span class="breakdown-name">${loc.name}</span>
                            <span class="breakdown-count">${loc.count}</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            ${insights.workoutBreakdown && insights.workoutBreakdown.length > 0 ? `
                <div class="expanded-section">
                    <h4>Workouts by Type</h4>
                    ${insights.workoutBreakdown.slice(0, 5).map(w => `
                        <div class="breakdown-row">
                            <i class="fas fa-dumbbell"></i>
                            <span class="breakdown-name">${w.name}</span>
                            <span class="breakdown-count">${w.count}</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            <div class="expanded-section">
                <h4>Average Workout</h4>
                <div class="breakdown-row">
                    <i class="fas fa-clock"></i>
                    <span class="breakdown-name">Duration</span>
                    <span class="breakdown-count">${insights.avgDuration || 'N/A'}</span>
                </div>
            </div>
        </div>
    `;
}

// ===================================================================
// BADGES SECTION (4-column Grid of Colored Icons)
// ===================================================================

function renderBadgesSection() {
    const badges = statsData.badges || [];
    const isExpanded = expandedSections.badges;
    const earnedBadges = badges.filter(b => b.earned);

    return `
        <div class="stats-section-header" onclick="toggleStatsSection('badges')">
            <span class="stats-section-title">Badges</span>
            <span class="view-more-link">${isExpanded ? 'Less' : 'View All'}</span>
        </div>

        <div class="badges-row-preview">
            ${earnedBadges.length > 0 ? earnedBadges.slice(0, 4).map(badge => `
                <div class="badge-preview-item ${badge.colorClass}">
                    <div class="badge-preview-icon">
                        <i class="${badge.icon}"></i>
                        ${badge.countBadge ? `<span class="badge-count-overlay">${badge.countBadge}</span>` : ''}
                    </div>
                    <span class="badge-preview-label">${badge.shortName}</span>
                </div>
            `).join('') : `
                <div class="badges-empty-msg">Complete workouts to earn badges!</div>
            `}
        </div>

        ${isExpanded ? renderBadgesExpanded(badges) : ''}
    `;
}

function renderBadgesExpanded(badges) {
    const earned = badges.filter(b => b.earned);
    const inProgress = badges.filter(b => !b.earned);

    return `
        <div class="badges-expanded">
            ${earned.length > 0 ? `
                <div class="badges-grid-section">
                    <h4>Earned</h4>
                    <div class="badges-full-grid">
                        ${earned.map(badge => `
                            <div class="badge-full-item ${badge.colorClass}">
                                <div class="badge-full-icon">
                                    <i class="${badge.icon}"></i>
                                    ${badge.countBadge ? `<span class="badge-count-overlay">${badge.countBadge}</span>` : ''}
                                </div>
                                <span class="badge-full-name">${badge.name}</span>
                                <span class="badge-full-desc">${badge.description}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            ${inProgress.length > 0 ? `
                <div class="badges-grid-section">
                    <h4>In Progress</h4>
                    <div class="badges-full-grid">
                        ${inProgress.map(badge => `
                            <div class="badge-full-item locked">
                                <div class="badge-full-icon">
                                    <i class="${badge.icon}"></i>
                                </div>
                                <span class="badge-full-name">${badge.name}</span>
                                <span class="badge-full-progress">${badge.progress || ''}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

// ===================================================================
// RECENT PRS SECTION
// ===================================================================

function renderRecentPRsSection() {
    const recentPRs = statsData.recentPRs || [];
    const isExpanded = expandedSections.prs;
    const totalPRCount = PRTracker.getTotalPRCount();

    return `
        <div class="stats-section-header mt-lg" onclick="toggleStatsSection('prs')">
            <span class="stats-section-title">Recent PRs</span>
            <span class="view-more-link">${isExpanded ? 'Less' : 'View All'}</span>
        </div>

        <div class="prs-card-new">
            ${recentPRs.length > 0 ? `
                <div class="prs-list-new">
                    ${recentPRs.slice(0, 3).map(pr => renderPRItem(pr)).join('')}
                </div>
            ` : `
                <div class="prs-empty-new">
                    <p>No PRs recorded yet</p>
                    <p class="prs-hint">PRs tracked from ${formatDateShort(PRTracker.getPRCutoffDate())}</p>
                </div>
            `}

            ${isExpanded ? renderPRsExpanded() : ''}
        </div>
    `;
}

function renderPRItem(pr) {
    const dateDisplay = formatRelativeDate(pr.date);

    return `
        <div class="pr-item-new">
            <div class="pr-item-icon">
                <i class="fas fa-dumbbell"></i>
            </div>
            <div class="pr-item-content">
                <div class="pr-item-exercise">${pr.exercise}</div>
                <div class="pr-item-details">
                    <span class="pr-item-type">MAX WEIGHT</span>
                    <span class="pr-item-value">· ${pr.weight} lb × ${pr.reps}</span>
                    <span class="pr-item-meta">· ${dateDisplay}${pr.location ? ` · ${pr.location}` : ''}</span>
                </div>
            </div>
        </div>
    `;
}

function renderPRsExpanded() {
    const prsByBodyPart = PRTracker.getPRsByBodyPart();
    const bodyParts = Object.keys(prsByBodyPart).sort();

    if (bodyParts.length === 0) {
        return `<div class="prs-expanded-empty">Complete workouts to start tracking PRs</div>`;
    }

    return `
        <div class="prs-browser">
            ${bodyParts.map(bodyPart => {
                const exercises = prsByBodyPart[bodyPart];
                const exerciseCount = Object.keys(exercises).length;

                return `
                    <div class="pr-bodypart-group">
                        <div class="pr-bodypart-header" onclick="togglePRBodyPart('${bodyPart}')">
                            <span class="pr-bodypart-name">${bodyPart}</span>
                            <span class="pr-bodypart-count">${exerciseCount} exercise${exerciseCount !== 1 ? 's' : ''}</span>
                            <i class="fas fa-chevron-down pr-chevron"></i>
                        </div>
                        <div class="pr-bodypart-content" id="pr-group-${bodyPart.replace(/\s+/g, '-')}">
                            ${Object.entries(exercises).map(([exerciseName, equipmentPRs]) => `
                                <div class="pr-exercise-item">
                                    <div class="pr-exercise-title">${exerciseName}</div>
                                    ${Object.entries(equipmentPRs).map(([equipment, prs]) => `
                                        <div class="pr-equipment-item">
                                            <span class="pr-equip-name">${equipment}</span>
                                            <span class="pr-equip-value">${prs.maxWeight?.weight || 0} lbs x ${prs.maxWeight?.reps || 0}</span>
                                            <span class="pr-equip-date">${formatDateShort(prs.maxWeight?.date)}</span>
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
// INSIGHTS CALCULATION
// ===================================================================

async function calculateInsights() {
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

        const dayCount = {};
        const hourCount = { morning: 0, afternoon: 0, evening: 0, night: 0 };
        const locationCount = {};
        const workoutTypeCount = {};
        let totalDuration = 0;
        let monthlyVolume = 0;

        // Get current month for volume calculation
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        workouts.forEach(workout => {
            if (workout.completedAt) {
                const date = new Date(workout.completedAt);
                const day = date.toLocaleDateString('en-US', { weekday: 'short' });
                dayCount[day] = (dayCount[day] || 0) + 1;

                const hour = date.getHours();
                if (hour >= 5 && hour < 12) hourCount.morning++;
                else if (hour >= 12 && hour < 17) hourCount.afternoon++;
                else if (hour >= 17 && hour < 21) hourCount.evening++;
                else hourCount.night++;

                // Calculate monthly volume
                if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
                    if (workout.exercises) {
                        Object.values(workout.exercises).forEach(exercise => {
                            if (exercise.sets) {
                                exercise.sets.forEach(set => {
                                    if (set.weight && set.reps) {
                                        monthlyVolume += set.weight * set.reps;
                                    }
                                });
                            }
                        });
                    }
                }
            }

            if (workout.location) {
                locationCount[workout.location] = (locationCount[workout.location] || 0) + 1;
            }

            if (workout.workoutType) {
                workoutTypeCount[workout.workoutType] = (workoutTypeCount[workout.workoutType] || 0) + 1;
            }

            if (workout.totalDuration) {
                totalDuration += workout.totalDuration;
            }
        });

        // Get top 3 days
        const topDaysArr = Object.entries(dayCount).sort((a, b) => b[1] - a[1]).slice(0, 3);
        const topDays = topDaysArr.map(d => d[0]).join(', ');

        // Get time of day preference
        const timeEntries = Object.entries(hourCount).sort((a, b) => b[1] - a[1]);
        const timeOfDay = timeEntries[0][1] > 0 ? capitalize(timeEntries[0][0]) : 'N/A';

        // Top location
        const topLocationEntry = Object.entries(locationCount).sort((a, b) => b[1] - a[1])[0];
        const topLocation = topLocationEntry ? topLocationEntry[0] : null;

        // Top workout
        const topWorkoutEntry = Object.entries(workoutTypeCount).sort((a, b) => b[1] - a[1])[0];
        const topWorkout = topWorkoutEntry ? topWorkoutEntry[0] : null;

        // Breakdowns
        const locationBreakdown = Object.entries(locationCount)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

        const workoutBreakdown = Object.entries(workoutTypeCount)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

        const avgDurationMins = workouts.length > 0 ? Math.round((totalDuration / workouts.length) / 60) : 0;

        // Format monthly volume
        const formattedVolume = monthlyVolume > 0
            ? (monthlyVolume >= 1000 ? `${(monthlyVolume / 1000).toFixed(1)}k lbs` : `${monthlyVolume.toLocaleString()} lbs`)
            : 'N/A';

        return {
            topDays: topDays || 'N/A',
            timeOfDay,
            topLocation,
            topWorkout,
            locationBreakdown,
            workoutBreakdown,
            avgDuration: avgDurationMins > 0 ? `${avgDurationMins} min` : 'N/A',
            totalVolume: formattedVolume
        };

    } catch (error) {
        console.error('Error calculating insights:', error);
        return null;
    }
}

// ===================================================================
// BADGES CALCULATION
// ===================================================================

async function calculateBadges() {
    const stats = statsData.streaks;
    const prCount = PRTracker.getTotalPRCount();

    const workoutManager = new FirebaseWorkoutManager(AppState);
    const locations = await workoutManager.getUserLocations();
    const locationCount = locations.length;

    // Define badges with color classes matching the mockup
    const allBadges = [
        {
            id: 'consistency',
            name: 'Consistency',
            shortName: 'Consistency',
            description: 'Maintained a 7-day streak',
            icon: 'fas fa-check',
            colorClass: 'badge-turquoise',
            check: () => stats && stats.longestStreak >= 7
        },
        {
            id: 'workouts-100',
            name: '100 Workouts',
            shortName: '100 Workouts',
            description: 'Completed 100 workouts',
            icon: 'fas fa-dumbbell',
            colorClass: 'badge-gold',
            countBadge: stats && stats.totalWorkouts >= 50 ? '50' : null,
            check: () => stats && stats.totalWorkouts >= 50,
            progress: stats ? `${Math.min(stats.totalWorkouts, 100)}/100` : '0/100'
        },
        {
            id: 'heavy-lifter',
            name: '100 Lbs Lifted',
            shortName: '100 Lbs Lifted',
            description: 'Lifted 100+ lbs in a single set',
            icon: 'fas fa-weight-hanging',
            colorClass: 'badge-teal',
            check: () => prCount >= 1
        },
        {
            id: 'pr-streak',
            name: 'PR Streak',
            shortName: 'PR Streak',
            description: 'Set PRs on consecutive days',
            icon: 'fas fa-calendar-check',
            colorClass: 'badge-purple',
            check: () => prCount >= 5,
            progress: `${Math.min(prCount, 5)}/5 PRs`
        },
        {
            id: 'first-workout',
            name: 'First Workout',
            shortName: 'First',
            description: 'Completed your first workout',
            icon: 'fas fa-star',
            colorClass: 'badge-gold',
            check: () => stats && stats.totalWorkouts >= 1
        },
        {
            id: 'streak-30',
            name: '30-Day Streak',
            shortName: '30 Days',
            description: 'Worked out 30 days in a row',
            icon: 'fas fa-fire-alt',
            colorClass: 'badge-orange',
            check: () => stats && stats.longestStreak >= 30,
            progress: stats ? `${Math.min(stats.longestStreak, 30)}/30 days` : '0/30 days'
        },
        {
            id: 'explorer',
            name: 'Explorer',
            shortName: 'Explorer',
            description: 'Worked out at 5+ locations',
            icon: 'fas fa-map-marker-alt',
            colorClass: 'badge-teal',
            check: () => locationCount >= 5,
            progress: `${Math.min(locationCount, 5)}/5 locations`
        },
        {
            id: 'pr-hunter',
            name: 'PR Hunter',
            shortName: 'PRs',
            description: 'Set 10 personal records',
            icon: 'fas fa-trophy',
            colorClass: 'badge-gold',
            check: () => prCount >= 10,
            progress: `${Math.min(prCount, 10)}/10 PRs`
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

function formatRelativeDate(dateStr) {
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

    const diffDays = Math.floor((today - date) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateShort(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Legacy exports
export function filterPRs() {}
export function clearPRFilters() {}
