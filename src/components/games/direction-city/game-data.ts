export const stageNames=["City Explorer","Route Radar","Signpost Factory","Delivery Coder","LEAD Ride"];
export type Step="up"|"down"|"left"|"right";
export const stepIcon:Record<Step,string>={up:"⬆️",down:"⬇️",left:"⬅️",right:"➡️"};
export const stepWords:Record<Step,string>={up:"go straight",down:"go back",left:"turn left",right:"turn right"};
