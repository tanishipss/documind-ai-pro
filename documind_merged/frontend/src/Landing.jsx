import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';

export default function Landing() {
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 30;

    // Floating particles - pink and green
    const particleCount = 180;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    const pinkColor = new THREE.Color('#f9a8d4');
    const greenColor = new THREE.Color('#86efac');
    const mintColor = new THREE.Color('#a7f3d0');
    const roseColor = new THREE.Color('#fda4af');

    const palette = [pinkColor, greenColor, mintColor, roseColor];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
      sizes[i] = Math.random() * 3 + 1;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
    });

    const particles = new THREE.Points(geo, mat);
    scene.add(particles);

    // Floating geometric shapes
    const shapes = [];
    const shapeGeos = [
      new THREE.TorusGeometry(2, 0.4, 8, 24),
      new THREE.OctahedronGeometry(1.5),
      new THREE.IcosahedronGeometry(1.2),
      new THREE.TorusGeometry(1.5, 0.3, 6, 16),
    ];

    const shapeMats = [
      new THREE.MeshBasicMaterial({ color: '#f9a8d4', wireframe: true, transparent: true, opacity: 0.35 }),
      new THREE.MeshBasicMaterial({ color: '#86efac', wireframe: true, transparent: true, opacity: 0.35 }),
      new THREE.MeshBasicMaterial({ color: '#fda4af', wireframe: true, transparent: true, opacity: 0.3 }),
      new THREE.MeshBasicMaterial({ color: '#a7f3d0', wireframe: true, transparent: true, opacity: 0.3 }),
    ];

    const positions3D = [
      [-12, 8, -5], [14, -6, -8], [-8, -10, -3], [10, 10, -6], [-16, 2, -10], [18, -2, -7]
    ];

    positions3D.forEach((pos, i) => {
      const mesh = new THREE.Mesh(
        shapeGeos[i % shapeGeos.length],
        shapeMats[i % shapeMats.length]
      );
      mesh.position.set(...pos);
      mesh.userData = {
        rotSpeed: (Math.random() - 0.5) * 0.02,
        floatSpeed: Math.random() * 0.01 + 0.005,
        floatOffset: Math.random() * Math.PI * 2,
        baseY: pos[1],
      };
      scene.add(mesh);
      shapes.push(mesh);
    });

    let mouse = { x: 0, y: 0 };
    const onMouseMove = (e) => {
      mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.y = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMouseMove);

    let frame = 0;
    const animate = () => {
      const id = requestAnimationFrame(animate);
      frame++;

      particles.rotation.y += 0.0008;
      particles.rotation.x += 0.0003;

      // Parallax
      camera.position.x += (mouse.x * 3 - camera.position.x) * 0.04;
      camera.position.y += (mouse.y * 2 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);

      shapes.forEach((s) => {
        s.rotation.x += s.userData.rotSpeed;
        s.rotation.y += s.userData.rotSpeed * 0.7;
        s.position.y = s.userData.baseY + Math.sin(frame * s.userData.floatSpeed + s.userData.floatOffset) * 1.5;
      });

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: 'linear-gradient(135deg, #fdf2f8 0%, #f0fdf4 50%, #fce7f3 100%)' }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0 }} />

      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '20px', textAlign: 'center' }}>
        {/* Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(10px)', borderRadius: 999, padding: '6px 18px', marginBottom: 28, border: '1px solid #fce7f3', fontSize: 13, fontWeight: 600, color: '#ec4899', animation: 'fadeIn 0.6s ease both' }}>
          ✨ AI-Powered Document Intelligence
        </div>

        {/* Title */}
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(42px, 7vw, 80px)', fontWeight: 700, lineHeight: 1.1, marginBottom: 20, animation: 'fadeIn 0.7s 0.1s ease both', opacity: 0 }}>
          <span style={{ color: '#2d1b2e' }}>Learn Smarter</span>
          <br />
          <span style={{ background: 'linear-gradient(135deg, #ec4899, #22c55e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>with DocuMind</span>
        </h1>

        {/* Subtitle */}
        <p style={{ fontSize: 18, color: '#5c4a6e', maxWidth: 520, lineHeight: 1.7, marginBottom: 40, animation: 'fadeIn 0.7s 0.2s ease both', opacity: 0 }}>
          Upload your documents, get AI-generated quizzes, summaries, flashcards, and discover your weak areas — all running locally on Ollama.
        </p>

        {/* Features row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 44, animation: 'fadeIn 0.7s 0.3s ease both', opacity: 0 }}>
          {['📄 PDF & DOCX', '🧠 Smart Quiz', '📊 Progress', '🃏 Flashcards', '🔍 Weak Areas', '✨ Summaries'].map(f => (
            <span key={f} style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', border: '1px solid #fce7f3', borderRadius: 999, padding: '8px 16px', fontSize: 13, fontWeight: 500, color: '#5c4a6e' }}>
              {f}
            </span>
          ))}
        </div>

        {/* CTA Buttons */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', animation: 'fadeIn 0.7s 0.4s ease both', opacity: 0 }}>
          <button
            className="btn-primary"
            onClick={() => navigate('/signup')}
            style={{ fontSize: 16, padding: '14px 36px' }}
          >
            Get Started Free →
          </button>
          <button
            className="btn-ghost"
            onClick={() => navigate('/login')}
            style={{ fontSize: 16, padding: '14px 36px', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(8px)' }}
          >
            Sign In
          </button>
        </div>

        {/* Bottom hint */}
        <p style={{ marginTop: 40, fontSize: 12, color: '#9c7fb5', animation: 'fadeIn 0.7s 0.6s ease both', opacity: 0 }}>
          Runs 100% locally • No API keys • Powered by Ollama
        </p>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
