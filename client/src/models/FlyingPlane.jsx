import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Plane } from "./Plane";

export function FlyingPlane() {
  const ref = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // Fly in a curved forward arc and loop
    const speed = 2;
    const z = -5 + (t * speed) % 20; // Loops every 20 seconds
    const y = Math.sin(t * 0.8) * 0.5 + 2; // Sine wave up-down
    const x = Math.sin(t * 0.4) * 2; // Slight side-to-side motion

    ref.current.position.set(x, y, z);

    // Make plane face direction of movement
    ref.current.rotation.y = Math.PI; // Face toward +Z
    ref.current.rotation.x = 0.05 * Math.sin(t * 1.5); // subtle pitch
    ref.current.rotation.z = 0.1 * Math.sin(t); // subtle roll
  });

  return (
    <group ref={ref} scale={[0.18, 0.18, 0.18]}>
        <Plane rotation={[0, Math.PI / 2, 0]} />
    </group>
  );
}
