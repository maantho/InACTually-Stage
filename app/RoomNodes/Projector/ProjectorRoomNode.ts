
/*
	InACTually
	> interactive theater for actual acts
	> this file is part of the "InACTually Stage", a spatial Interface for orchestrating interactive Media

	Copyright(c) 2025 InACTually Community
	Licensed under the MIT License.
	See LICENSE file in the project root for full license information.

	This file is created and substantially modified: 2025

	contributors:
	Lars Engeln - mail@lars-engeln.de
	Anton Hörig - dev@antonhoerig.de
*/

import type { Object3D } from "three";
import RoomNodeBase, { RoomNodeState } from "../RoomNodeBase";
import { RoomNodeType, fromRoomNodeType } from "../RoomNodeRegistry";
import * as THREE from "three";
import loadModel from "~/app/Utils/ModelLoader";
import type IRoomNodePublisher from "~/app/Network/IRoomNodePublisher";
import Parameter from "../Utils/Parameter";

export default class ProjectorRoomNode extends RoomNodeBase {
	private m_frustum: THREE.LineSegments = {} as THREE.LineSegments;
	private m_frustumGeom: THREE.BufferGeometry = new THREE.BufferGeometry();
	private m_frustumIntersectionWithGround: THREE.Mesh[] = [] as THREE.Mesh[];
	private m_localFarPoints: THREE.Vector3[] = [] as THREE.Vector3[];


	private m_resolution = new Parameter<{ x: number, y: number}>("resolution", { x: 1920, y: 1080 }, { x: 1, y: 1 }, {x: 10000, y: 10000 }, this.publishParams.bind(this));
	private m_isCalibrating = new Parameter<boolean>("isCalibrating", false, false, true, this.publishParams.bind(this));
	private m_focalLengthPixel = new Parameter<{ x: number, y: number}>("focalLengthPixel", { x: 800, y: 800 }, { x: 0, y: 0 }, {x: 1000000, y: 1000000 }, this.publishParams.bind(this));
	private m_skew = new Parameter<number>("skew", 0, -1000000, 1000000, this.publishParams.bind(this));
	private m_principalPoint = new Parameter<{ x: number, y: number}>("principalPoint", { x: 960, y: 540 }, { x: 0, y: 0 }, {x: 10000, y: 10000 }, this.publishParams.bind(this));

	constructor(publisher: IRoomNodePublisher, onLoadCb: { (roomNode: RoomNodeBase): void }, uid?: string, position?: THREE.Vector3, orientation?: THREE.Quaternion) {
		super("projector", publisher, onLoadCb, uid, position, orientation);
		this.setup(onLoadCb);

	}
	public override setup(onLoadCb: { (roomNode: RoomNodeBase): void }): void {
		this.m_caption.value = "Projector";
		this.m_roomNodeType = RoomNodeType.RNT_PROJECTOR;

		loadModel("/models/output_unidirectional.glb").then((model: THREE.Object3D) => {
			//model.scale.set(0.5, 0.5, 0.5);
			let position = this.m_object3D.position.clone();
			let orientation = this.m_object3D.quaternion.clone();

			this.m_object3D = reactive<THREE.Object3D>(model);
			this.m_object3D.name = "Projector";

			this.getRawObject3D().position.copy(position);
			this.getRawObject3D().quaternion.copy(orientation);

			this.setupObject3DWatcher();

			//const geometry = new THREE.SphereGeometry(5, 16, 16, 0, Math.PI);
			this.calculateFrustum();
			const material = new THREE.LineBasicMaterial({color: 0x9370DB, linewidth: 3});
			const frustum = new THREE.LineSegments(this.m_frustumGeom, material);

			const axesHelper = new THREE.AxesHelper(2);
			this.getRawObject3D().add(axesHelper);

			// const quaternionX = new THREE.Quaternion();
			// quaternionX.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);

			// const quaternionZ = new THREE.Quaternion();
			// quaternionZ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 4);


			// frustum.applyQuaternion(quaternionX.multiply(quaternionZ));

			let intersectionMaterial = new THREE.MeshStandardMaterial({ color: 0x9370DB });
			
			let intersectionGeometry = new THREE.SphereGeometry(0.05, 32, 32); // radius, widthSegments, heightSegments
			for (let i = 0; i < 4; i++) {
				const mesh = new THREE.Mesh(intersectionGeometry, intersectionMaterial);
				this.m_frustumIntersectionWithGround.push(mesh);
				this.getRawObject3D().add(mesh);
			}

			this.m_frustum = frustum;
			this.m_frustum.visible = true;
			//this.m_frustum.layers.set(2);

			this.getRawObject3D().add(this.m_frustum);

			onLoadCb(this);
		});

	}

	public override update(): void {
		let origin = this.getObject3D().position.clone();

		//calculate intersection with ground plane
		for (let i = 0; i < 4; i++) {
			let globalFarPoint = this.getObject3D().localToWorld(this.m_localFarPoints[i].clone());
			let direction = new THREE.Vector3().subVectors(globalFarPoint, origin).normalize();
			
			let ray = new THREE.Ray(origin, direction);

			let groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

			// 3. Find intersection
			let hitPoint = new THREE.Vector3();
			if (ray.intersectPlane(groundPlane, hitPoint)) {
				let hitPointLocal = this.getObject3D().worldToLocal(hitPoint.clone());
				this.m_frustumIntersectionWithGround[i].position.copy(hitPointLocal);
			}
		}

	}

	public getFrustum(): THREE.LineSegments {
		return this.m_frustum;
	}

	public getResolution(): Ref<{ x: number, y: number }> {
		return this.m_resolution.value;
	}

	public setResolution(resolution: {x: number, y: number}): void {
		this.m_resolution.value = resolution;
		this.calculateFrustum();
	}

	public getIsCalibrating(): Ref<boolean> {
		return this.m_isCalibrating.value;
	}

	public setIsCalibrating(isCalibrating: boolean): void {
		this.m_isCalibrating.value = isCalibrating;
	}

	public getFocalLengthPixel(): Ref<{ x: number, y: number }> {
		return this.m_focalLengthPixel.value;
	}

	public setFocalLengthPixel(focalLength: {x: number, y: number}): void {
		this.m_focalLengthPixel.value = focalLength;
		this.calculateFrustum();
	}

	public getSkew(): Ref<number> {
		return this.m_skew.value;
	}

	public setSkew(skew: number): void {
		this.m_skew.value = skew;
		this.calculateFrustum();
	}

	public getPrincipalPoint(): Ref<{ x: number, y: number }> {
		return this.m_principalPoint.value;
	}

	public setPrincipalPoint(principalPoint: {x: number, y: number}): void {
		this.m_principalPoint.value = principalPoint;
		this.calculateFrustum();
	}

	private calculateFrustum() {
		const z = -5;
		const points: THREE.Vector3[] = [];
		for (let x = 0; x < 2; x++) {
			for (let y = 0; y < 2; y++) {
				points.push(new THREE.Vector3(0));
				//poitn at z=5
				let farPoint = new THREE.Vector3(0, 0, z)
				let u = this.m_resolution.value.value.x * x;
				let v = this.m_resolution.value.value.y * y;
				
				let cx = this.m_principalPoint.value.value.x;
				let cy = this.m_principalPoint.value.value.y;
				let fx = this.m_focalLengthPixel.value.value.x;
				let fy = this.m_focalLengthPixel.value.value.y;
				let skew = this.m_skew.value.value;
				
				let normY = (v - cy) / fy;
				let normX = (u - cx - skew * normY) / fx;
				
				farPoint.x = normX * -z;
				farPoint.y = normY * z;

				points.push(farPoint);
			}
		}

		this.m_localFarPoints = [ points[1], points[3], points[7], points[5] ];

		// Connect far-plane edges
		for (let i = 0; i < 4; i++) {
			const next = (i + 1) % 4;
			points.push(this.m_localFarPoints[i], this.m_localFarPoints[next]);
		}

		this.m_frustumGeom.setFromPoints(points);
	}

	public override onDragStart() {
		this.showFrustum(true);
	}
	public override onDragEnd() {
		this.showFrustum(false);
	}

	public showFrustum(value: boolean) {
		if (value)
			this.m_frustum.layers.set(0);
		else
			this.m_frustum.layers.set(2);
	}

	public resetCorrespondences(): void {
		this.publishParams({ ["resetCorrespondences"]: true })
	}

	public publishObjectPoint(point: {x: number, y: number, z: number}): void {
		if(this.m_isCalibrating)
			this.publishParams({ ["objectPoint"]: point })
	}

	public override toParams(): any {
		let params = {} as any;
		params.resolution = this.m_resolution.value;
		params.focalLengthPixel = this.m_focalLengthPixel.value;
		params.skew = this.m_skew.value;
		params.principalPoint = this.m_principalPoint.value;

		return params;
	}

	public override fromParams(params: any): void {
		if (params.resolution !== undefined)
			this.setResolution(params.resolution);
		if (params.focalLengthPixel !== undefined)
			this.setFocalLengthPixel(params.focalLengthPixel);
		if (params.skew !== undefined)
			this.setSkew(params.skew);
		if (params.principalPoint !== undefined)
			this.setPrincipalPoint(params.principalPoint);
		if (params.isCalibrating !== undefined)
			this.setIsCalibrating(params.isCalibrating);
	}
}
