import type { InfoCard, PartId } from './types'

/**
 * All info-card copy in one typed place. Facts describe a car in the style of a modern
 * Formula 1 single-seater under the 2026 technical rules. No team, sponsor or driver names.
 */
export const INFO_CARDS: Record<PartId, InfoCard> = {
  monocoque: {
    title: 'Survival cell',
    role: 'The carbon tub the driver sits in. It is the strongest part of the car and the structure everything else hangs off.',
    facts: [
      'Laid up from carbon fibre composite skins over an aluminium honeycomb core and cured in an autoclave.',
      'Must pass a series of FIA static load and crash tests every season before the car is allowed to race.',
    ],
    connects:
      'Nose ahead, engine and gearbox behind as stressed members, front suspension on its flanks.',
  },
  'cockpit-seat': {
    title: 'Cockpit and seat',
    role: 'A seat moulded to the individual driver, with head padding and the cockpit surround that closes the tub.',
    facts: [
      'The seat can be lifted out with the driver still strapped in, so medical crews can move an injured driver safely.',
      'Drivers sit almost lying down with their feet above their hips to keep the car as low as possible.',
    ],
    connects: 'Bolts into the floor of the tub. The halo closes over it from above.',
  },
  halo: {
    title: 'Halo',
    role: 'The titanium hoop above the cockpit that protects the driver from large debris and heavy impacts.',
    facts: [
      'Made from titanium and weighs about 7 kg.',
      'Tested to hold a static load of 125 kN, roughly the weight of a double-decker bus.',
    ],
    connects:
      'Three mounting points on the tub: two behind the driver and one strut ahead of the cockpit.',
  },
  'roll-hoop': {
    title: 'Roll hoop and airbox',
    role: 'The structure behind the head that protects the driver in a rollover, wrapped by the engine air intake.',
    facts: [
      'The hoop must survive FIA load tests pressing down, back and sideways to prove it can carry the car in a rollover.',
      'The intake sits high so it swallows clean air flowing over the helmet rather than turbulence off the bodywork.',
    ],
    connects: 'Mounted on top of the tub behind the driver; the engine cover wraps around it.',
  },
  'nose-cone': {
    title: 'Nose cone and crash structure',
    role: 'A hollow carbon structure designed to crush progressively and absorb the energy of a head-on impact.',
    facts: [
      'The FIA frontal impact test fires the nose into a barrier at 15 metres per second.',
      'It also sets the airflow for the whole car, so teams reshape it as often as the aero regulations allow.',
    ],
    connects: 'Bolts to the front bulkhead of the tub; the front wing hangs below on two pylons.',
  },
  engine: {
    title: 'Internal combustion engine',
    role: 'A 1.6 litre V6 turbo that burns sustainable fuel and forms the structural spine between tub and gearbox.',
    facts: [
      'Revs to a limit of 15,000 rpm with a 90 degree V angle fixed by the rules.',
      'Under the 2026 rules it makes roughly 400 kW, with the electrical side adding nearly as much again.',
    ],
    connects:
      'Bolted to the rear of the tub as a stressed member, with the gearbox hanging off its back.',
  },
  turbocharger: {
    title: 'Turbocharger',
    role: 'Uses exhaust gas to spin a turbine that drives a compressor, forcing more air into the engine.',
    facts: [
      'The shaft spins at well over 100,000 rpm.',
      'The 2026 rules remove the MGU-H, so the turbo relies on exhaust energy alone to spool up.',
    ],
    connects:
      'Sits above the bell housing between engine and gearbox, fed by the exhaust manifold.',
  },
  'mgu-k': {
    title: 'MGU-K',
    role: 'Motor Generator Unit, Kinetic. It harvests energy under braking and feeds it back as extra drive.',
    facts: [
      'The 2026 rules lift its output to 350 kW, about 470 horsepower, nearly three times the previous limit.',
      'Under braking it does much of the slowing itself, which is why the rear brakes can be smaller.',
    ],
    connects: 'Geared to the crankshaft on the side of the engine and cabled to the energy store.',
  },
  'energy-store': {
    title: 'Energy store',
    role: 'The lithium-ion battery pack that banks energy from the MGU-K and releases it on demand.',
    facts: [
      'Mounted low inside the survival cell, under the fuel cell, for protection and a low centre of gravity.',
      'The 2026 rules allow it to recover several times more energy per lap than the previous generation.',
    ],
    connects: 'Sits behind the seat; cabled to the MGU-K and the control electronics.',
  },
  gearbox: {
    title: 'Gearbox',
    role: 'An eight-speed sequential gearbox whose casing also carries the rear suspension and crash structure.',
    facts: [
      'Eight forward gears and one reverse, with seamless shifts that take a few hundredths of a second.',
      'The casing is structural: the rear wishbones, driveshafts and rear crash structure all mount to it.',
    ],
    connects:
      'Bolted to the back of the engine; rear suspension and rear wing mount to its casing.',
  },
  exhaust: {
    title: 'Exhaust',
    role: 'Carries gas from the turbine to a single tailpipe under the rear wing, with two wastegate pipes beside it.',
    facts: [
      'Gas leaves the turbine at well over 900 degrees Celsius, so the pipes are nickel alloy rather than steel.',
      'Its heat and flow are used to help energise the air around the rear wing and beam wing.',
    ],
    connects: 'Runs from the turbine housing back along the top of the gearbox.',
  },
  'front-suspension': {
    title: 'Front suspension',
    role: 'Twin carbon wishbones per side with a push-rod that works springs and dampers hidden inside the nose.',
    facts: [
      'The push-rod runs from the lower wishbone up into rockers on top of the tub.',
      'Every arm has an aerofoil cross-section because it shapes airflow as much as it carries load.',
    ],
    connects: 'Inboard ends mount on the tub, outboard ends on the front uprights.',
  },
  'rear-suspension': {
    title: 'Rear suspension',
    role: 'Wishbones and a pull-rod hung off the gearbox, with driveshafts passing through to the wheels.',
    facts: [
      'The pull-rod pulls down on rockers mounted low on the gearbox, keeping weight low.',
      'Rear suspension geometry is tuned to keep the floor at a steady ride height for the underbody aero.',
    ],
    connects: 'Mounted on the gearbox casing; outboard ends on the rear uprights.',
  },
  'front-uprights': {
    title: 'Front uprights',
    role: 'The hubs at the end of the suspension that carry the wheel bearings, brakes and steering arms.',
    facts: [
      'Machined from titanium or high-strength steel with cooling passages for the brakes.',
      'The steering track rod attaches here to turn the wheel.',
    ],
    connects: 'Clamped between the upper and lower wishbones; the wheel bolts onto the axle.',
  },
  'rear-uprights': {
    title: 'Rear uprights',
    role: 'Hubs that carry the rear wheel bearings and brakes and pass drive torque from the driveshafts.',
    facts: [
      'They house the driveshaft joints as well as the bearings and brake mounts.',
      'A toe link replaces the steering arm to hold the wheel angle fixed.',
    ],
    connects:
      'Between the rear wishbones and the wheel, with the driveshaft entering from the gearbox.',
  },
  'front-brakes': {
    title: 'Front brakes',
    role: 'Carbon discs and calipers that do most of the stopping on a car with no servo assistance.',
    facts: [
      'Carbon-carbon discs and pads run between 400 and 1,000 degrees Celsius and only bite properly when hot.',
      'Peak deceleration from high speed can exceed 5 g.',
    ],
    connects: 'Disc on the axle, caliper bolted to the upright, cooled by ducts inside the wheel.',
  },
  'rear-brakes': {
    title: 'Rear brakes',
    role: 'Smaller than the fronts, they share the work with the MGU-K through a brake-by-wire system.',
    facts: [
      'Brake-by-wire balances friction braking against energy harvesting so the pedal feels consistent.',
      'Discs are carbon-carbon like the fronts, drilled with hundreds of tiny cooling holes.',
    ],
    connects:
      'Disc on the rear axle, caliper on the upright, controlled electronically from the pedal.',
  },
  'wheel-fl': {
    title: 'Front left wheel',
    role: 'An 18 inch wheel and slick tyre; the fronts are narrower than the rears and do the steering.',
    facts: [
      'Tyres are heated in blankets before a run and work best in a narrow window around 90 to 110 degrees Celsius.',
      'The wheel is a forged alloy and the whole corner can be changed in under two seconds at a pit stop.',
    ],
    connects: 'Bolted onto the front left upright with a single centre nut.',
  },
  'wheel-fr': {
    title: 'Front right wheel',
    role: 'An 18 inch wheel and slick tyre; the fronts are narrower than the rears and do the steering.',
    facts: [
      'A slick tyre has no tread so the whole contact patch grips in the dry; grooved tyres are used in the wet.',
      'Tyre pressures are set in fractions of a psi because they change grip and temperature so much.',
    ],
    connects: 'Bolted onto the front right upright with a single centre nut.',
  },
  'wheel-rl': {
    title: 'Rear left wheel',
    role: 'The wider driven rear wheel that puts the engine and MGU-K power onto the track.',
    facts: [
      'Rear tyres are wider than the fronts to cope with traction loads out of slow corners.',
      'Tyre wear is managed lap by lap; a worn rear surface overheats and loses grip quickly.',
    ],
    connects: 'Bolted onto the rear left upright, driven by the driveshaft from the gearbox.',
  },
  'wheel-rr': {
    title: 'Rear right wheel',
    role: 'The wider driven rear wheel that puts the engine and MGU-K power onto the track.',
    facts: [
      'Wheel covers over the rims are standard parts that stop teams using the wheels as aero devices.',
      'A sensor in each tyre reports pressure and temperature to the pit wall in real time.',
    ],
    connects: 'Bolted onto the rear right upright, driven by the driveshaft from the gearbox.',
  },
  floor: {
    title: 'Floor',
    role: 'The flat underbody with shaped tunnels that produce the biggest share of the downforce.',
    facts: [
      'Air accelerating through the underfloor tunnels creates low pressure that sucks the car onto the track.',
      'A plank under the floor may wear no more than 1 mm over a race, which polices ride height.',
    ],
    connects:
      'Bolted under the tub and gearbox; sidepods sit on top and the diffuser continues behind.',
  },
  diffuser: {
    title: 'Diffuser',
    role: 'The rising section at the back of the floor that slows the underbody air and recovers pressure.',
    facts: [
      'Expanding the airflow smoothly lets the floor ahead of it pull harder on the car.',
      'The 2026 rules trim how much downforce the floor can make compared with the 2022 to 2025 cars.',
    ],
    connects:
      'Continues the floor upwards behind the rear axle, beneath the gearbox and crash structure.',
  },
  sidepods: {
    title: 'Sidepods',
    role: 'The bodies either side of the driver that house the radiators and shape airflow to the rear.',
    facts: [
      'They hold the radiators that cool the engine, hybrid system and gearbox oil.',
      'Their shape steers air over the floor edges and towards the rear wing, so teams redesign them several times a season.',
    ],
    connects: 'Fixed to the tub sides and the floor; the engine cover meets them on top.',
  },
  'engine-cover': {
    title: 'Engine cover and shark fin',
    role: 'The bodywork over the engine and airbox, with a fin along its spine.',
    facts: [
      'Shaped to guide clean air onto the rear wing while hiding the cooling exits.',
      'The shark fin steadies the car in yaw and gives extra stability through fast corners.',
    ],
    connects: 'Clips over the roll hoop, engine and sidepod tops.',
  },
  'front-wing': {
    title: 'Front wing',
    role: 'The first thing the air meets. It makes front downforce and sets up the flow for everything behind.',
    facts: [
      'Several flap elements stack behind a main plane, each adding downforce without the flow separating.',
      'Under the 2026 rules the flap can flatten on straights to cut drag, part of the new active aero.',
    ],
    connects: 'Hangs beneath the nose on two pylons; endplates cap each tip.',
  },
  'rear-wing': {
    title: 'Rear wing',
    role: 'Main plane, moveable flap and beam wing working together to load the rear tyres.',
    facts: [
      'In 2026 active aero opens both front and rear wings on the straights, replacing the old DRS system.',
      'The rear wing generates a large share of the total drag, which is why opening it adds so much speed.',
    ],
    connects:
      'Mounted on the gearbox and rear crash structure through a central pylon and the endplates.',
  },
  bargeboards: {
    title: 'Bargeboards',
    role: 'Small vanes and deflectors that tidy the messy air coming off the front wheels.',
    facts: [
      'They steer front-wheel wake away from the sidepod inlets and the floor edge.',
      'The 2022 rules removed the huge bargeboard arrays, leaving only compact deflectors like these.',
    ],
    connects: 'Fixed to the floor edge and sidepod shoulders ahead of the radiator inlets.',
  },
  'steering-wheel': {
    title: 'Steering wheel',
    role: 'The control centre: steering, shift paddles, clutch paddles, a display and dozens of switches.',
    facts: [
      'A carbon fibre frame with around 25 buttons and rotaries plus a colour display.',
      'It pulls off a quick-release hub so the driver can climb in and out of the narrow cockpit.',
    ],
    connects: 'Quick-release hub onto the steering column inside the cockpit.',
  },
  mirrors: {
    title: 'Mirrors',
    role: 'Small mirrors on stalks beside the cockpit so the driver can see cars behind.',
    facts: [
      'The rules set a minimum reflective area and mounting position so the mirrors are actually usable.',
      'The housings are shaped as miniature aero devices to tidy the air over the sidepods.',
    ],
    connects: 'On stalks from the cockpit sides, just ahead of the sidepod inlets.',
  },
  'rain-light': {
    title: 'Rain light',
    role: 'The red LED cluster on the tail that warns following drivers in spray and when the car is harvesting energy.',
    facts: [
      'Mandatory on every car and driven by the FIA standard electronic control unit.',
      'It flashes in wet conditions and lights steadily when the hybrid system is slowing the car.',
    ],
    connects: 'Mounted on the end of the rear crash structure beneath the wing.',
  },
}
