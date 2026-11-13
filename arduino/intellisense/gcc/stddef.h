/* intestazione minima del compilatore avr-gcc, solo per IntelliSense */
#ifndef _STDDEF_H
#define _STDDEF_H
typedef unsigned int size_t;
typedef int ptrdiff_t;
typedef int wchar_t_dummy;
#ifndef __cplusplus
typedef int wchar_t;
#endif
#ifndef NULL
#ifdef __cplusplus
#define NULL 0
#else
#define NULL ((void *)0)
#endif
#endif
#define offsetof(type, member) __builtin_offsetof(type, member)
#endif
