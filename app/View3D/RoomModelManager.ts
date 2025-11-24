
/*
	InACTually
	> interactive theater for actual acts
	> this file is part of the "InACTually Stage", a spatial Interface for orchestrating interactive Media

	Copyright(c) 2023–2025 Fabian Töpfer, Lars Engeln
	Copyright(c) 2025 InACTually Community
	Licensed under the MIT License.
	See LICENSE file in the project root for full license information.

	This file is created and substantially modified: 2023-2025

	contributors:
	Fabian Töpfer - baniaf@uber.space
	Lars Engeln - mail@lars-engeln.de
*/

import * as THREE from "three";
import loadModel, { loadCollada } from "../Utils/ModelLoader";
import { GridMode } from "./GridManager";

const vertexShader = `
 
    varying vec4 v_shadowCoord;
    varying vec2 v_uv;
    uniform mat4 u_matrix;
    void main() {
        v_uv = uv;
        v_shadowCoord = u_matrix * modelMatrix* vec4(position, 1.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`

const fragmentShader = `
   
varying vec4      v_shadowCoord;   // Shadow coordinates
varying vec2      v_uv;              // Texture coordinates
uniform sampler2D u_shadowMap; // Shadow map texture
uniform sampler2D u_tex; // model texture

uniform vec3 u_color;
uniform vec3 u_borderColor;
uniform float u_useSolidColor;
uniform float u_useShadowMap;


vec3 reduceSaturation(vec3 color, float saturation) {
    float gray = dot(color, vec3(0.299, 0.587, 0.114));
    return mix(vec3(gray), color, saturation);
}


void main() {

    if(u_useShadowMap < 0.5){
        gl_FragColor = vec4(u_color,1.0);
        return;
    }

    vec3 shadowCoord = v_shadowCoord.xyz / v_shadowCoord.w;
 
    if (shadowCoord.x < 0.0 || shadowCoord.x > 1.0 || shadowCoord.y < 0.0 || shadowCoord.y > 1.0) {
        discard;
    }

    float shadowDepth = texture2D(u_shadowMap, shadowCoord.xy).r;

    float bias = -0.0001;
    float shadow = shadowCoord.z + bias > shadowDepth ? 0.0 : 1.0;


    // most simple edge detection
    float offset = 1.0 / 1024.0;
    
    float depthLeft =   texture2D(u_shadowMap, shadowCoord.xy + vec2(-offset, 0.0)).r;
    float depthRight =  texture2D(u_shadowMap, shadowCoord.xy + vec2(offset, 0.0)).r;
    float depthUp =     texture2D(u_shadowMap, shadowCoord.xy + vec2(0.0, offset)).r;
    float depthDown =   texture2D(u_shadowMap, shadowCoord.xy + vec2(0.0, -offset)).r;

    //  differences
    float diffX = abs(depthLeft - depthRight);
    float diffY = abs(depthUp - depthDown);

    float edge = step(0.7, diffX + diffY); // outline "sensitivity"

    // shadow
    gl_FragColor = vec4(u_borderColor, 1.0);
    if(edge < 0.8){
        if(u_useSolidColor > 0.5){
               gl_FragColor = vec4(u_color, 1.0);
        }
        else{
            vec4 textureColor = texture2D(u_tex, v_uv);
            gl_FragColor = vec4(reduceSaturation(textureColor.rgb, 0.0),1.0);
        }
    }
}
`
export enum ModelMode {
	ABSTRACT_PLANE,
	ABSTRACT_MODEL,
	ROOM_MODEL
}
export default class RoomModelManager {

	public constructor(scene: THREE.Scene, size: { x: number, y: number }) {
		this.setup(scene, size);
	}

	private abstractPlane = new THREE.Object3D();
	private abstractModel = new THREE.Object3D();
	private roomModel = new THREE.Object3D();

	private m_currentModelMode = ModelMode.ABSTRACT_PLANE;

	private m_shaderMaterial = new THREE.ShaderMaterial();
	private m_isSetup = false;
	private m_raycaster = {} as THREE.Raycaster;

	private m_roomModelMaterial = {} as THREE.MeshStandardMaterial;
	private m_abstractModelMaterial = {} as THREE.MeshStandardMaterial;

	getCurrentModelMode(): ModelMode {
		return this.m_currentModelMode;
	}

	getAbstractPlane(): THREE.Object3D {
		return this.abstractPlane;
	}

	getAbstractModel(): THREE.Object3D {
		return this.abstractModel;
	}

	getRoomModel(): THREE.Object3D {
		return this.roomModel;
	}

	getCurrentModel(): THREE.Object3D {
		switch (this.m_currentModelMode) {
			case ModelMode.ABSTRACT_PLANE: {
				return this.abstractPlane;
			}
			case ModelMode.ABSTRACT_MODEL: {
				return this.abstractModel;
			}
			case ModelMode.ROOM_MODEL: {
				return this.roomModel;
			}
		}
	}

	setCurrentModel(mode: ModelMode) {

		this.m_currentModelMode = mode;

		this.abstractPlane.visible = mode == ModelMode.ABSTRACT_PLANE;
		this.abstractModel.visible = mode == ModelMode.ABSTRACT_MODEL;
		this.roomModel.visible = mode == ModelMode.ROOM_MODEL;

		if (mode == ModelMode.ABSTRACT_PLANE) {
			this.m_shaderMaterial.uniforms.u_useSolidColor.value = 1.0;
		}
		if (mode == ModelMode.ROOM_MODEL) {
			this.m_shaderMaterial.uniforms.u_useSolidColor.value = 0;
			this.m_shaderMaterial.uniforms.u_tex.value = this.m_roomModelMaterial.map;
		}
	}

	onGridChanged(gridMode: GridMode) {
		if (gridMode == GridMode.GM_RADIAL) {
			this.abstractPlane.getObjectByName("rectPlane")!.visible = false;
			this.abstractPlane.getObjectByName("radialPlane")!.visible = true;
		} else {
			this.abstractPlane.getObjectByName("rectPlane")!.visible = true;
			this.abstractPlane.getObjectByName("radialPlane")!.visible = false;
		}
	}

	getIntersectionWithRoomModel(origin: THREE.Vector3, dir: THREE.Vector3 = new THREE.Vector3(0, -1, 0)): THREE.Intersection[] {

		dir.normalize();
		this.m_raycaster.set(origin, dir);
		const model = this.getCurrentModel();

		if (model)
			return this.m_raycaster.intersectObject(model, true);

		return [];
	}


	public setShadowMapParams(shadow: THREE.DirectionalLightShadow) {

		this.m_shaderMaterial.uniforms.u_shadowMap.value = shadow.map?.texture;
		this.m_shaderMaterial.uniforms.u_matrix.value = shadow.matrix;
		this.m_shaderMaterial.uniforms.u_useShadowMap.value = 1.0;
	}


	setup(scene: THREE.Scene, size: { x: number, y: number }) {

		if (this.m_isSetup) {
			scene.remove(this.abstractPlane);
			scene.remove(this.abstractModel);
			scene.remove(this.roomModel);
		}

		this.m_raycaster = new THREE.Raycaster();
		this.m_isSetup = true;

		const rectGeometry = new THREE.BoxGeometry(size.x, size.y, 0.01);
		rectGeometry.computeBoundingBox();
		rectGeometry.computeBoundingSphere();

		const radialGeometry = new THREE.CircleGeometry(size.x / 2, 128);
		radialGeometry.computeBoundingBox();
		radialGeometry.computeBoundingSphere();


		this.m_shaderMaterial = new THREE.ShaderMaterial({
			vertexShader: vertexShader,
			fragmentShader: fragmentShader,
			uniforms: {
				u_shadowMap: { value: new THREE.Texture() },
				u_matrix: { value: new THREE.Matrix4 },
				u_color: { value: new THREE.Vector3(0.8745, 0.8745, 0.8745) },
				u_borderColor: { value: new THREE.Vector3(1.0, 0.851, 0.0) },
				u_tex: { value: new THREE.Texture() },
				u_useSolidColor: { value: 1 },
				u_useShadowMap: { value: 0.0 }
			},
		})


		let rectPlane = new THREE.Mesh(rectGeometry, this.m_shaderMaterial);
		rectPlane.position.set(5, -5, 0);
		rectPlane.name = "rectPlane";


		let radialPlane = new THREE.Mesh(radialGeometry, this.m_shaderMaterial);
		radialPlane.position.set(5, -5, 0);
		radialPlane.name = "radialPlane";

		this.abstractPlane = new THREE.Object3D();

		this.abstractPlane.add(rectPlane)
		this.abstractPlane.add(radialPlane)

		this.abstractPlane.rotateX(-Math.PI / 2);
		this.abstractPlane.visible = false;
		this.abstractPlane.position.y = -0.008;

		//scene.add(this.abstractPlane);

		/*const pathToModel = "/models/model_name.dae";

		loadCollada(pathToModel).then((model: THREE.Object3D) => {
			let bb = new THREE.Box3().setFromObject(model);
			let bbSize = new THREE.Vector3();
			bb.getSize(bbSize);

			const scaleFactor = size.x / bbSize.x;
			model.scale.setScalar(scaleFactor);
			model.visible = false;
			this.abstractModel = model;

			scene.add(this.abstractModel);
		});

		loadModel(pathToModel).then((model: THREE.Object3D) => {
			let bb = new THREE.Box3().setFromObject(model);
			let bbSize = new THREE.Vector3();
			bb.getSize(bbSize);

			const scaleFactor = size.x / bbSize.x;
			model.scale.setScalar(scaleFactor);

			model.traverse((obj) => {
				if (obj instanceof THREE.Mesh) {
					if ((obj as THREE.Mesh).material) {
						this.m_roomModelMaterial = ((obj as THREE.Mesh).material as THREE.MeshStandardMaterial).clone();
						(obj as THREE.Mesh).material = this.m_shaderMaterial;
					}
				}
			})


			this.roomModel = model;
			this.roomModel.visible = false;
			this.roomModel.position.y = -0.08
			scene.add(this.roomModel);
		});*/

		this.setCurrentModel(this.m_currentModelMode);
	}


	update() {

	}
}
