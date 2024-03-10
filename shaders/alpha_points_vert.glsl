#version 300 es
precision mediump float;

in vec3 in_vertex;   
in vec3 in_color; 

uniform mat4 MVP;    
uniform float radius;
out vec3 color;

void main(void) {
    gl_Position = MVP * vec4(in_vertex, 1.0);
    gl_PointSize = radius;
    color = in_color;
}
