
import * as THREE from 'https://cdn.skypack.dev/three@0.133.1';


function defaultGeo () {
    let geometry = new THREE.IcosahedronGeometry(1.4, 0);
    let indexMap = new Map();
    let indices = [];
    let vertices = [];
    let uvs = [];
    let addVert = (x, y, z) => {
        let key = x.toFixed(2) + ',' + y.toFixed(2) + ',' + z.toFixed(2);
        if (indexMap.has(key)) {
            let idx = indexMap.get(key);
            indices.push(idx);
            return;
        }
        let idx = vertices.length / 3;
        vertices.push(x, y, z);
        indices.push(idx);
        indexMap.set(key, idx);
    };
    let origVerts = geometry.getAttribute('position').array;
    for (let i = 0; i < origVerts.length / 3; ++i) {
        addVert(origVerts[i*3], origVerts[i*3+1], origVerts[i*3+2]);
    }
    geometry = new THREE.BufferGeometry();
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
    return geometry;
};


// creates the initial mesh & resources to tessellate
export function initialTessellatedGeometry () {
    const originalGeo = defaultGeo();
    let indices = [...originalGeo.getIndex().array];
    let vertices = [...originalGeo.getAttribute('position').array];
    let edges = [];
    for (let i = 0; i < vertices.length; i += 3) {
        edges.push(new Set());
    }
    const appendConnections = (a, b) => {
        edges[a].add(b);
        edges[b].add(a);
    }
    for (let i = 0; i < indices.length; i += 3) {
        const a = indices[i];
        const b = indices[i+1];
        const c = indices[i+2];
        appendConnections(a, b);
        appendConnections(b, c);
        appendConnections(c, a);
    }
    
    return {
        geo: originalGeo,
        indices: indices,
        vertices: vertices,
        edges: edges
    }
}


// adds a single vertex, resulting in subdivisions on the mesh
export function addVert(tess) {
            
    // get a random vertex in the edge (vert -> vert[]) map
    const a = parseInt(Math.random() * tess.edges.length);
    const b = [...tess.edges[a]][parseInt(Math.random() * tess.edges[a].size)];
    const c = tess.vertices.length / 3;
    tess.vertices.push((tess.vertices[a*3] + tess.vertices[b*3]) * 0.5, (tess.vertices[a*3+1] + tess.vertices[b*3+1]) * 0.5, (tess.vertices[a*3+2] + tess.vertices[b*3+2]) * 0.5);
    // update edge map
    tess.edges.push(new Set());
    tess.edges[a].delete(b); tess.edges[b].delete(a);
    tess.edges[a].add(c);    tess.edges[b].add(c);
    tess.edges[c].add(a);    tess.edges[c].add(b);
    // replace any tris sharing edge [a,b] with two tris ( (a, b, f) -> (a, c, f) + (c, b, f) )
    for (let i = 0; i < tess.indices.length; i += 3) {
        const d = tess.indices[i];
        const e = tess.indices[i+1];
        const f = tess.indices[i+2];
        if ((d == a && e == b) || (d == b && e == a)) { // tri with F
            tess.indices[i] = c; // replace with a, c, f
            tess.indices.push(d, c, f); // add b, c, f
            tess.edges[c].add(f);    tess.edges[f].add(c);
        } else if ((e == a && f == b) || (e == b && f == a)) { // tri with D
            tess.indices[i+1] = c; // replace with d, c, a
            tess.indices.push(d, e, c); // add d, c, b
            tess.edges[c].add(d);    tess.edges[d].add(c);
        } else if ((f == a && d == b) || (f == b && d == a)) { // tri with E
            tess.indices[i+2] = c; // replace with a, e, c
            tess.indices.push(f, c, e); // add b, e, c
            tess.edges[c].add(e);    tess.edges[e].add(c);
        }
    }
    
    // refresh rendering res
    let geo = new THREE.BufferGeometry();
    geo.setIndex(tess.indices);
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(tess.vertices), 3));
    return geo;
}
