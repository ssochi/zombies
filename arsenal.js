'use strict';

// Shared by simulation, the articulated weapon art, and the equipment HUD.
const WEAPONS = Object.freeze({
  rifle: Object.freeze({
    id:'rifle', name:'AK-47', label:'AK-47 · 7.62 × 39mm', role:'全自动步枪', key:'1',
    magSize:30, reserve:150, fireInterval:.125, pellets:1, damage:1,
    spread:.003, movingSpread:.009, sprintSpread:.024, heatSpread:.009,
    muzzleLife:.064, muzzleScale:1, reloadDuration:1.85,
    kickSnap:2.8, kickImpulse:130, kickSpring:21, maxKick:7, climbSnap:.032, climbImpulse:.95, climbSpring:9, maxClimb:.15, impactImpulse:85, impactStop:.032, shotStop:.012, cameraSnap:1.6, heatPerShot:.14,
    barrelLength:50, gripX:32, triggerX:13, stockLength:15,
    color:'#704020', metal:'#353b32', shellColor:'#d3b66b', shotSound:'shot',
    cameraKick:34, shake:1.15, projectileSpeed:1050, range:900, pelletFalloff:false
  }),
  smg: Object.freeze({
    id:'smg', name:'MP5', label:'MP5 · 9 × 19mm', role:'近距冲锋枪', key:'2',
    magSize:36, reserve:180, fireInterval:.065, pellets:1, damage:.64,
    spread:.006, movingSpread:.013, sprintSpread:.03, heatSpread:.016,
    muzzleLife:.042, muzzleScale:.7, reloadDuration:1.55,
    kickSnap:1.6, kickImpulse:78, kickSpring:25, maxKick:5.5, climbSnap:.018, climbImpulse:.5, climbSpring:11, maxClimb:.11, impactImpulse:48, impactStop:.019, shotStop:.006, cameraSnap:.85, heatPerShot:.09,
    barrelLength:36, gripX:25, triggerX:11, stockLength:13,
    color:'#3d4947', metal:'#282e2c', shellColor:'#bfa468', shotSound:'smg',
    cameraKick:19, shake:.65, projectileSpeed:1000, range:750, pelletFalloff:false
  }),
  shotgun: Object.freeze({
    id:'shotgun', name:'M870', label:'M870 · 12 GA', role:'泵动霰弹枪', key:'3',
    magSize:8, reserve:56, fireInterval:.67, pellets:7, damage:.72,
    spread:.047, movingSpread:.06, sprintSpread:.083, heatSpread:.013,
    muzzleLife:.085, muzzleScale:1.55, reloadDuration:2.35,
    kickSnap:5.8, kickImpulse:215, kickSpring:18, maxKick:11, climbSnap:.085, climbImpulse:1.8, climbSpring:8, maxClimb:.25, impactImpulse:42, impactStop:.052, shotStop:.027, cameraSnap:3.2, heatPerShot:.36,
    barrelLength:56, gripX:35, triggerX:14, stockLength:19,
    color:'#8d5130', metal:'#39403c', shellColor:'#9e3024', shotSound:'shotgun',
    cameraKick:62, shake:2.05, projectileSpeed:1060, range:560, pelletFalloff:true,
    pumpDuration:.3
  }),
  pistol: Object.freeze({
    id:'pistol', name:'M1911', label:'M1911 · .45 ACP', role:'大口径半自动手枪', key:'4',
    magSize:10, reserve:90, fireInterval:.24, pellets:1, damage:1.75, semiAuto:true, headshotScale:1.2,
    spread:.0025, movingSpread:.008, sprintSpread:.025, heatSpread:.012,
    muzzleLife:.062, muzzleScale:.88, reloadDuration:1.4,
    kickSnap:4.1, kickImpulse:158, kickSpring:20, maxKick:9, climbSnap:.057, climbImpulse:1.15, climbSpring:8.2, maxClimb:.2,
    impactImpulse:110, impactStop:.041, shotStop:.018, cameraSnap:2.1, heatPerShot:.19,
    barrelLength:21, gripX:8, triggerX:4, stockLength:4,
    color:'#6c4833', metal:'#535950', shellColor:'#c7a362', shotSound:'pistol',
    cameraKick:41, shake:1.35, projectileSpeed:1060, range:820, pelletFalloff:false
  }),
  crowbar: Object.freeze({
    id:'crowbar', name:'撬棍', label:'撬棍 · 近战破坏', role:'扇形近战 / 击退断肢', key:'5',
    melee:true, magSize:0, reserve:0, fireInterval:.62, pellets:0, damage:2.6,
    range:90, swingDuration:.46, staminaCost:16, arc:1.25, maxTargets:3,
    spread:0, movingSpread:0, sprintSpread:0, heatSpread:0,
    muzzleLife:0, muzzleScale:0, reloadDuration:0,
    kickSnap:2.4, kickImpulse:105, kickSpring:15, maxKick:8, climbSnap:.025, climbImpulse:.5, climbSpring:8, maxClimb:.14,
    impactImpulse:155, impactStop:.065, shotStop:0, cameraSnap:.8, heatPerShot:0,
    barrelLength:40, gripX:11, triggerX:3, stockLength:0,
    color:'#923c2d', metal:'#899087', shellColor:'#899087', shotSound:'swing',
    cameraKick:23, shake:1.3, projectileSpeed:0, pelletFalloff:false
  })
});
const WEAPON_ORDER = Object.freeze(Object.keys(WEAPONS));
function weaponById(id) { return WEAPONS[id] || WEAPONS.rifle; }
