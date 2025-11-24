
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
	Anton Hörig - dev@antonhoerig.de
*/

import * as THREE from "three";
import type RoomManager from "../RoomManager";
import type RoomNodeBase from "../RoomNodes/RoomNodeBase";
import { OrbitControls, TransformControls } from "three/examples/jsm/Addons.js";
import { RoomNodeType } from "../RoomNodes/RoomNodeRegistry";

import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';
import ProjectorRoomNode from "../RoomNodes/Projector/ProjectorRoomNode";
import XRHandGestures from "./XRHandGestures";

export default class UI3D {

	private m_raycaster = new THREE.Raycaster();
	private m_pointer = new THREE.Vector2(0, 0);
	private m_canvas = {} as HTMLElement;
	private m_roomManager = {} as RoomManager;
	private m_xr = {} as THREE.WebXRManager;

	public selectedRoomNode = shallowRef<RoomNodeBase>();
	public hoveredRoomNode = shallowRef<RoomNodeBase>();

	private m_transformControls = {} as TransformControls;
	private m_transformControlsDragging = false;
	public orbitControls = {} as OrbitControls;
	private m_prevOrbitDistance = 1.0;

	private m_dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.5);
	private m_template3DObjectContainer = new THREE.Object3D();

	private m_hand0Gestures = {} as XRHandGestures;
	private m_hand1Gestures = {} as XRHandGestures;

	private m_newXROrigin: THREE.Vector3 | null = null;


	private m_xrreferenceSpaceHandle = new THREE.AxesHelper(0.5);

	constructor(canvas: HTMLElement, roomManager: RoomManager) {
		this.m_canvas = canvas;
		this.m_roomManager = roomManager;
		this.m_roomManager.deselectSelectedRoomNode = () => { this.setSelectedRoomNode(undefined) }
		//this.setup();
	}
	
	public getSelectedRoomNode() {
		return this.selectedRoomNode;
	}
	
	public setup() {
		this.m_xr = this.m_roomManager.stage.getXR()!;
		this.setupListeners()

		this.orbitControls = new OrbitControls(this.m_roomManager.stage.getCamera().value, this.m_roomManager.stage.getDOMElement());
		this.m_prevOrbitDistance = this.orbitControls.getDistance();

		this.orbitControls.addEventListener("change", (event) => {
			if (Math.abs(this.orbitControls.getDistance() - this.m_prevOrbitDistance) > 0.001) {
				this.m_prevOrbitDistance = this.orbitControls.getDistance();
			}
			this.m_roomManager.onCameraChanged();
		})

		this.m_transformControls = new TransformControls(this.m_roomManager.stage.getCamera().value, this.m_roomManager.stage.getDOMElement());

		this.m_transformControls.addEventListener("dragging-changed", (event: any) => {
			this.orbitControls.enabled = !event.value;
			this.m_transformControlsDragging = event.value;
			this.selectedRoomNode.value?.setIsDragged(event.value);
			this.selectedRoomNode.value!.getRoomNodeType();
			this.m_roomManager.onRoomNodeChanged(this.selectedRoomNode.value!, event.value);
		})

		this.m_transformControls.addEventListener("change", () => { });

		this.m_transformControls.size = 0.7;

		this.m_roomManager.stage.getScene().add(this.m_transformControls);
		this.m_roomManager.stage.getScene().add(this.m_template3DObjectContainer);
		this.m_template3DObjectContainer.position.set(0, -100, 0);

		this.m_roomManager.stage.getScene().add(this.m_xrreferenceSpaceHandle);

		this.setupControls();
	}

	public setCamera() {
		this.m_transformControls.camera = this.m_roomManager.stage.getCamera().value;
		this.orbitControls.object = this.m_roomManager.stage.getCamera().value;
	}



	private setupListeners() {
		if (this.m_canvas == null) {
			console.warn("[APP] Cannot setup listeners! No HTML element provided!")
			return;
		}

		this.m_canvas.addEventListener("pointerdown", (ev) => {
			this.onPointerDown(ev, this.m_roomManager.stage.getCamera().value);
		})
		this.m_canvas.addEventListener("pointerup", (ev) => {
			this.onPointerUp(ev, this.m_roomManager.stage.getCamera().value);
		})
		this.m_canvas.addEventListener("pointermove", (ev) => {
			this.onPointerMove(ev, this.m_roomManager.stage.getCamera().value);
		})
		this.m_canvas.addEventListener("dragenter", (ev) => {

		});
		this.m_canvas.addEventListener("dragover", (ev) => {
			this.onDragOver(ev, this.m_roomManager.stage.getCamera().value);
			ev.preventDefault();
		});
		this.m_canvas.addEventListener("dragleave", (ev) => {


		});
		this.m_canvas.addEventListener("drop", (ev) => {
			this.onDrop(ev, this.m_roomManager.stage.getCamera().value);

		});

		document.addEventListener("keypress", (ev: KeyboardEvent) => {
			if (this.m_transformControls.enabled)
				switch (ev.key) {
					case "g": {
						this.m_transformControls.setMode("translate");
						break;
					}
					case "r": {
						this.m_transformControls.setMode("rotate");
						break;
					}
					case "s": {
						if (this.selectedRoomNode.value?.getRoomNodeType() == RoomNodeType.RNT_ACTIONSPACE)
							this.m_transformControls.setMode("scale");
						break;
					}
				}
		})
	}


	public isClickedOnTransformAxis(
		raycaster: THREE.Raycaster,
		transformControls: TransformControls
	): boolean {
		// Early return if transform controls don't have expected structure
		if (!transformControls?.children?.[0]?.children) {
			return false;
		}

		const intersections = raycaster.intersectObjects(
			transformControls.children[0].children,
			true
		);

		return intersections.some(intersection => {
			const object = intersection.object;
			return (
				['X', 'Y', 'Z'].includes(object.name) &&
				object.visible &&
				object.type === 'Mesh'
			);
		});
	}


	public onPointerDown(event: PointerEvent, camera: THREE.Camera): void {

		let intersections = this.m_roomManager.onClick(this.setRaycaster(event, camera));
		intersections.sort((a, b) => a.distance - b.distance);

		if (intersections.length > 0) {
			this.setSelectedRoomNode(intersections[0].roomNode, intersections[0].obj3D)
		} else {
			if (this.selectedRoomNode.value) {
				if (this.isClickedOnTransformAxis(this.m_raycaster, this.m_transformControls))
					return;
			}
			this.setSelectedRoomNode(undefined)
		}
	}

	public onPointerMove(event: PointerEvent, camera: THREE.Camera): void {
		if (this.m_transformControlsDragging)
			return;


		let intersections = this.m_roomManager.onHover(this.setRaycaster(event, camera));
		intersections.sort((a, b) => a.distance - b.distance);
		if (intersections.length > 0) {
			this.setHoveredRoomNode(intersections[0].roomNode, intersections[0].obj3D)
		} else {
			this.setHoveredRoomNode(undefined)
		}
	}

	public onPointerUp(event: PointerEvent, camera: THREE.Camera): void { }

	public onDragOver(event: DragEvent, camera: THREE.Camera): void {
		this.setRaycaster(event, camera);
		let target = new THREE.Vector3()
		this.m_raycaster.ray.intersectPlane(this.m_dragPlane, target);
		this.m_template3DObjectContainer.position.copy(target);
	}
	public onDrop(event: DragEvent, camera: THREE.Camera): void {
	}

	public setRaycaster(event: PointerEvent | DragEvent, camera: THREE.Camera): THREE.Raycaster {
		this.m_pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
		this.m_pointer.y = - (event.clientY / window.innerHeight) * 2 + 1;

		this.m_raycaster.setFromCamera(this.m_pointer, camera);
		return this.m_raycaster;
	}

	public hitsRoomNodeFrom2DEvent(event: PointerEvent | DragEvent): RoomNodeBase | undefined {
		let intersections = this.m_roomManager.onHover(this.getRaycasterFrom2DEvent(event));
		intersections
			.filter((i: { roomNode: RoomNodeBase, distance: number }) => i.roomNode.getRoomNodeType() == RoomNodeType.RNT_ACTIONSPACE)
			.sort((a, b) => a.distance - b.distance);

		if (intersections.length > 0) {
			return intersections[0].roomNode
		} else {
			return undefined
		}
	}

	public get3DFrom2DEvent(event: PointerEvent | DragEvent, distance: number): THREE.Vector3 {
		let target = new THREE.Vector3();
		this.getRaycasterFrom2DEvent(event).ray.at(distance, target);
		return target;
	}

	public getRaycasterFrom2DEvent(event: PointerEvent | DragEvent): THREE.Raycaster {
		this.m_pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
		this.m_pointer.y = - (event.clientY / window.innerHeight) * 2 + 1;

		this.m_raycaster.setFromCamera(this.m_pointer, this.m_roomManager.stage.getCamera().value);

		return this.m_raycaster;
	}


	public setSelectedRoomNode(roomNode: RoomNodeBase | undefined, obj3D?: THREE.Object3D) {

		this.m_transformControls.detach();

		//reset first
		if (this.selectedRoomNode.value) {
			this.selectedRoomNode.value.setIsSelected(false);
			//this.selectedRoomNode.value.getRawObject3D().remove(this.m_boundingBox);
			this.selectedRoomNode.value = undefined;
		}

		if (roomNode) {
			roomNode.setIsSelected(true);
			this.selectedRoomNode.value = roomNode;
			// roomNode.getRawObject3D().add(this.m_boundingBox);

			if (obj3D)
				this.m_transformControls.attach(obj3D);
			if (this.m_transformControls.mode == "scale" && this.selectedRoomNode.value.getRoomNodeType() != RoomNodeType.RNT_ACTIONSPACE) {
				this.m_transformControls.setMode("translate");
			}
		}
	}

	public setHoveredRoomNode(roomNode: RoomNodeBase | undefined, obj3D?: THREE.Object3D) {
		//reset first
		if (this.hoveredRoomNode.value) {
			this.hoveredRoomNode.value.setIsHovered(false);
			this.hoveredRoomNode.value = undefined;
			if (!this.selectedRoomNode.value)
				this.m_transformControls.detach();
		}

		if (roomNode) {
			roomNode.setIsHovered(true);
			this.hoveredRoomNode.value = roomNode;
			if (obj3D)
				this.m_transformControls.attach(obj3D);
			if (this.m_transformControls.mode == "scale" && this.hoveredRoomNode.value.getRoomNodeType() != RoomNodeType.RNT_ACTIONSPACE) {
				this.m_transformControls.setMode("translate");
			}

		}
	}

	public addDragTemplateObject(obj: THREE.Object3D) {
		this.m_template3DObjectContainer.add(obj);
	}

	public removeDragTemplateObject(): THREE.Vector3 {

		while (this.m_template3DObjectContainer.children.length) {
			this.m_template3DObjectContainer.remove(this.m_template3DObjectContainer.children[0]);
		}

		let pos = this.m_template3DObjectContainer.position.clone();
		this.m_template3DObjectContainer.position.set(0, -100, 0);
		return pos;
	}

	private setupControls() {
		let leftControlRay = this.createControlRay(0);
		let rightControlRay = this.createControlRay(1);

		let hand0 = this.createHand(0);
		let hand1 = this.createHand(1);
		this.m_hand0Gestures = new XRHandGestures(hand0);
		this.m_hand1Gestures = new XRHandGestures(hand1);
		
		/*
		let material = new THREE.MeshStandardMaterial({ color: 0x0077ff });

		let geometry = new THREE.SphereGeometry(0.01, 32, 32); // radius, widthSegments, heightSegments
		let sphere0 = new THREE.Mesh(geometry, material);
		this.m_roomManager.stage.getScene().add(sphere0);

		geometry = new THREE.SphereGeometry(0.025, 32, 32);
		let sphere1 = new THREE.Mesh(geometry, material);
		this.m_roomManager.stage.getScene().add(sphere1);

		this.m_hand0Gestures.addDebugMeshes(sphere0, sphere1, material);
		*/
		
		this.m_hand0Gestures.activateCloseGesture(this.handClosed.bind(this),() => {}, () => {});
		this.m_hand1Gestures.activateCloseGesture(this.handClosed.bind(this), () => {}, () => {});

		this.m_hand0Gestures.activatePinchGesture(this.handPinched.bind(this), this.handPinchHeld.bind(this), this.handPinchReleased.bind(this));
		this.m_hand1Gestures.activatePinchGesture(this.handPinched.bind(this), this.handPinchHeld.bind(this), this.handPinchReleased.bind(this));

		let leftController = this.createController(0);
		let rightController = this.createController(1);
	}

	private createControlRay(index: number) {
		const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0, -2)]);
		const line = new THREE.Line(geometry);
		line.name = 'line';

		let controlRay = this.m_xr.getController(index);
		controlRay.add(line);

		this.m_roomManager.stage.getScene().add(controlRay);
		return line;
	}
	private createHand(index: number): THREE.XRHandSpace {
		const handModelFactory = new XRHandModelFactory();
		let hand = this.m_xr.getHand(index);

		//Add debug geometry
		//hand.add(handModelFactory.createHandModel(hand, "mesh"));

		this.m_roomManager.stage.getScene().add(hand);
		return hand;
	}
	private createController(index: number): THREE.XRGripSpace {
		const controllerModelFactory = new XRControllerModelFactory();
		let controllerGrip = this.m_xr.getControllerGrip(index);
		controllerGrip.add(controllerModelFactory.createControllerModel(controllerGrip));

		this.m_roomManager.stage.getScene().add(controllerGrip);
		return controllerGrip;
	}

	public update(){
		this.m_hand0Gestures.update();
		this.m_hand1Gestures.update();
	}

	private handClosed(position: THREE.Vector3, orientation: THREE.Quaternion){
		const projectorManager = this.m_roomManager.getRoomNodeMgrByRoomNodeType(RoomNodeType.RNT_PROJECTOR)
		if (projectorManager) {
			for (const projector of projectorManager.getRoomNodes()) {
				if (projector instanceof ProjectorRoomNode){
					if(projector.getIsCalibrating()){
						projector.publishObjectPoint({x: position.x, y: position.y, z: position.z})
						let material = new THREE.MeshStandardMaterial({ color: 0x0077ff });
						let geometry = new THREE.SphereGeometry(0.025, 32, 32); // radius, widthSegments, heightSegments
						let sphere = new THREE.Mesh(geometry, material);
						sphere.position.set(position.x, position.y, position.z);
						this.m_roomManager.stage.getScene().add(sphere);
					}
				}
			}
		}
	}

	private handPinched(position: THREE.Vector3, orientation: THREE.Quaternion){
		if (!this.m_newXROrigin) {
			this.m_newXROrigin = position; // set origin
			this.m_xrreferenceSpaceHandle.position.copy(position);
		}
	}

	private handPinchHeld(position: THREE.Vector3, orientation: THREE.Quaternion){
		if (this.m_newXROrigin)  { //use exsiting origin and new position as foreward
			const z = this.m_newXROrigin.clone().sub(position);
			z.y = 0; //z projected on ground
			z.normalize()
			const y = new THREE.Vector3(0, 1, 0);
			const x = y.clone().cross(z).normalize();
			
			const rotMatrix = new THREE.Matrix4();
			rotMatrix.makeBasis(x, y, z); 
			
			const quat = new THREE.Quaternion().setFromRotationMatrix(rotMatrix);

			this.m_xrreferenceSpaceHandle.quaternion.copy(quat);
		}
	}

	private handPinchReleased(position: THREE.Vector3, orientation: THREE.Quaternion){
		this.handPinchHeld;
		if (this.m_newXROrigin)  { 

			this.applyReferenceSpaceTransform();

			this.m_newXROrigin = null; //next one is origin again
		}
	}


	private applyReferenceSpaceTransform(){
		const baseRefSpace = this.m_xr.getReferenceSpace();
		if (!baseRefSpace) 
			return;
		
		let worldPos = this.m_xrreferenceSpaceHandle.getWorldPosition(new THREE.Vector3());
		let worldQuat = this.m_xrreferenceSpaceHandle.getWorldQuaternion(new THREE.Quaternion());
		
		const transform = new XRRigidTransform(
		  { x: worldPos.x, y: worldPos.y, z: worldPos.z },
		  { x: worldQuat.x, y: worldQuat.y, z: worldQuat.z, w: worldQuat.w }
		);
		
		const offsetSpace = baseRefSpace.getOffsetReferenceSpace(transform);
		this.m_xr.setReferenceSpace(offsetSpace);

		this.m_xrreferenceSpaceHandle.position.set(0, 0,0 );
		this.m_xrreferenceSpaceHandle.setRotationFromQuaternion(new THREE.Quaternion());
	}

}
