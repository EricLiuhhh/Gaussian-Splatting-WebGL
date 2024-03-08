#version 300 es
precision mediump float;

uniform mat4 MVP;
uniform float alpha_limit;
uniform highp int stage;
uniform vec3 rayOrigin;

in vec3 worldPos;
in vec3 ellipsoidCenter;
in vec3 ellipsoidScale;
in mat3 ellipsoidRotation;
in vec3 colorVert;
in float alphaVert;
flat in int boxID;

layout (location = 0) out vec4 out_color;
//layout (location = 1) out uint out_id;
layout (location = 1) out int out_id;

vec3 closestEllipsoidIntersection(vec3 rayDirection, out vec3 normal) {
  // Convert ray to ellipsoid space
  vec3 localRayOrigin = (rayOrigin - ellipsoidCenter) * ellipsoidRotation;
  vec3 localRayDirection = normalize(rayDirection * ellipsoidRotation);

  vec3 oneover = float(1) / vec3(ellipsoidScale);
  
  // Compute coefficients of quadratic equation
  float a = dot(localRayDirection * oneover, localRayDirection * oneover);
  float b = 2.0 * dot(localRayDirection * oneover, localRayOrigin * oneover);
  float c = dot(localRayOrigin * oneover, localRayOrigin * oneover) - 1.0;
  
  // Compute discriminant
  float discriminant = b * b - 4.0 * a * c;
  
  // If discriminant is negative, there is no intersection
  if (discriminant < 0.0) {
    return vec3(0.0);
  }
  
  // Compute two possible solutions for t
  float t1 = float((-b - sqrt(discriminant)) / (2.0 * a));
  float t2 = float((-b + sqrt(discriminant)) / (2.0 * a));
  
  // Take the smaller positive solution as the closest intersection
  float t = min(t1, t2);
  
  // Compute intersection point in ellipsoid space
  vec3 localIntersection = vec3(localRayOrigin + t * localRayDirection);

  // Compute normal vector in ellipsoid space
  vec3 localNormal = normalize(localIntersection / ellipsoidScale);
  
  // Convert normal vector to world space
  normal = normalize(ellipsoidRotation * localNormal);
  
  // Convert intersection point back to world space
  vec3 intersection = ellipsoidRotation * localIntersection + ellipsoidCenter;
  
  return intersection;
}

void main(void) {
	vec3 dir = normalize(worldPos - rayOrigin);

	vec3 normal;
	vec3 intersection = worldPos;//closestEllipsoidIntersection(dir, normal);
	float align = max(0.4, dot(-dir, normal));
	
	out_color = vec4(1, 0, 0, 1);
	
	if(intersection == vec3(0))
		discard;

	vec4 newPos = MVP * vec4(intersection, 1);
	newPos /= newPos.w;

	gl_FragDepth = newPos.z;

	float a = stage == 0 ? 1.0 : 0.05f;

	//out_color = vec4(align * colorVert, a);
  out_color = vec4(colorVert, a);
	out_id = boxID;
}
