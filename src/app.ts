import {
  ACESFilmicToneMapping,
  CameraHelper,
  DirectionalLight,
  Mesh,
  MeshLambertMaterial,
  PCFShadowMap,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  VSMShadowMap,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { Moon } from "./moon";
import GUI from "lil-gui";

export class App {
  scene: Scene;
  renderer: WebGLRenderer;

  light: DirectionalLight;

  lightAngle = 30;

  camera: PerspectiveCamera;

  moon: Moon;
  //moon2: Moon;

  controls: OrbitControls;

  time = performance.now();

  constructor(element: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({
      canvas: element,
      antialias: true,
      logarithmicDepthBuffer: true,
      powerPreference: "high-performance",
    });

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = VSMShadowMap;

    this.renderer.toneMapping = ACESFilmicToneMapping;

    const gui = new GUI();

    this.scene = new Scene();

    this.moon = new Moon(gui.addFolder("Moon"));
    this.scene.add(this.moon);

    /*
    this.moon2 = new Moon(gui.addFolder("The Second Moon"));
    this.moon2.position.set(this.moon.options.radius * -1.2, 0, 0);
    this.moon2.scale.multiplyScalar(0.3);
    this.scene.add(this.moon2);

    const sphere = new Mesh(new SphereGeometry(300000, 64, 64), new MeshLambertMaterial({}));
    sphere.position.set(this.moon.options.radius * -0.9, this.moon.options.radius * 0.4, 0);
    sphere.castShadow = true;
    sphere.receiveShadow = true;
    this.scene.add(sphere);
    */

    this.camera = new PerspectiveCamera();
    this.scene.add(this.camera);

    this.camera.position.z = this.moon.options.radius * 3;

    this.light = new DirectionalLight(0xffffff, 2);
    this.light.position.set(-2, 0, -1);
    this.light.castShadow = true;

    if (this.light.shadow != null) {
      this.light.shadow.bias = -0.002;
      this.light.shadow.mapSize.width = 2048;
      this.light.shadow.mapSize.height = 2048;

      const camera = this.light.shadow.camera;

      camera.left = -this.moon.options.radius * 1.5;
      camera.bottom = -this.moon.options.radius * 1.5;
      camera.right = this.moon.options.radius * 1.5;
      camera.top = this.moon.options.radius * 1.5;
      camera.near = -this.moon.options.radius * 1.5;
      camera.far = this.moon.options.radius * 1.5;

      camera.updateProjectionMatrix();
    }
    this.scene.add(this.light);

    gui.add(this, "lightAngle", 0, 360).name("Light Angle");
    gui.add(this.light, "castShadow").name("Shadows");

    this.renderer.info.autoReset = false;
    gui.add(this.renderer.info.render, "calls").name("THREE.js draw calls").disable(true).listen();

    this.controls = new OrbitControls(this.camera, element);

    this.tick(performance.now());
  }

  render() {
    const { devicePixelRatio } = window;
    const width = window.innerWidth * devicePixelRatio;
    const height = window.innerHeight * devicePixelRatio;

    if (true) {
      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / height;

      this.camera.near = 10;
      this.camera.far = this.moon.options.radius * 10;
      this.camera.fov = 60;
      this.camera.updateProjectionMatrix();
    }

    this.moon.updateQuadsphere(this.camera);
    //this.moon2.updateQuadsphere(this.camera);

    this.light.position.set(
      Math.sin((this.lightAngle / 180) * Math.PI),
      0,
      Math.cos((this.lightAngle / 180) * Math.PI)
    );

    this.renderer.info.reset();

    this.renderer.render(this.scene, this.camera);
  }

  tick(time: number) {
    const delta = time - this.time;
    this.time = time;

    this.controls.update(delta);

    this.render();

    requestAnimationFrame(this.tick.bind(this));
  }
}
