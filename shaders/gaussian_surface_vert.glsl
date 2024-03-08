#version 300 es
precision mediump float;

in vec3 a_col;
in vec3 a_center;
in float a_opacity;
in vec3 a_scale;
in vec4 a_rot;
//in vec3 a_covA;
//in vec3 a_covB;

uniform mat4 MVP;
uniform float alpha_limit;
uniform int stage;

mat3 quatToMat3(vec4 q) {
  float qx = q.y;
  float qy = q.z;
  float qz = q.w;
  float qw = q.x;

  float qxx = qx * qx;
  float qyy = qy * qy;
  float qzz = qz * qz;
  float qxz = qx * qz;
  float qxy = qx * qy;
  float qyw = qy * qw;
  float qzw = qz * qw;
  float qyz = qy * qz;
  float qxw = qx * qw;

  return mat3(
    vec3(1.0 - 2.0 * (qyy + qzz), 2.0 * (qxy - qzw), 2.0 * (qxz + qyw)),
    vec3(2.0 * (qxy + qzw), 1.0 - 2.0 * (qxx + qzz), 2.0 * (qyz - qxw)),
    vec3(2.0 * (qxz - qyw), 2.0 * (qyz + qxw), 1.0 - 2.0 * (qxx + qyy))
  );
}

const vec3 boxVertices[8] = vec3[8](
    vec3(-1, -1, -1),
    vec3(-1, -1,  1),
    vec3(-1,  1, -1),
    vec3(-1,  1,  1),
    vec3( 1, -1, -1),
    vec3( 1, -1,  1),
    vec3( 1,  1, -1),
    vec3( 1,  1,  1)
);

const int boxIndices[36] = int[36](
    0, 1, 2, 1, 3, 2,
    4, 6, 5, 5, 6, 7,
    0, 2, 4, 4, 2, 6,
    1, 5, 3, 5, 7, 3,
    0, 4, 1, 4, 5, 1,
    2, 3, 6, 3, 7, 6
);

out vec3 worldPos;
out vec3 ellipsoidCenter;
out vec3 ellipsoidScale;
out mat3 ellipsoidRotation;
out vec3 colorVert;
out float alphaVert;
flat out int boxID;

void main() {
	boxID = gl_InstanceID;
  ellipsoidCenter = a_center;
  float a = a_opacity;
	alphaVert = a;
	ellipsoidScale = a_scale;
	ellipsoidScale = 2.0 * ellipsoidScale;

	vec4 q = a_rot;
	ellipsoidRotation = transpose(quatToMat3(q));

  int vertexIndex = boxIndices[gl_VertexID];
  worldPos = ellipsoidRotation * (ellipsoidScale * boxVertices[vertexIndex]);
  worldPos += ellipsoidCenter;

	float r = a_col.r * 0.2 + 0.5;
	float g = a_col.g * 0.2 + 0.5;
	float b = a_col.b * 0.2 + 0.5;

	colorVert = vec3(r, g, b);
	
	if((stage == 0 && a < alpha_limit) || (stage == 1 && a >= alpha_limit))
	 	gl_Position = vec4(0,0,0,0);
	else
    gl_Position = MVP * vec4(worldPos, 1);
}