---
title: 面向对象·上·封装
pubDate: 2025-04-01
description: C++ 面向对象封装部分笔记：访问权限、构造与析构、深浅拷贝、静态成员、this 指针、友元、运算符重载，以及 const 与引用传参的常见用法。
---

> 将属性和行为作为一个整体，表现生活中的事物
>
> 将属性和行为加以权限控制

目录

-   [访问权限](#htoc-111)

-   [构造函数](#htoc-1111)

    -   [initialization list](#htoc-initialization-list)

-   [深拷贝与浅拷贝](#htoc-1111111)

-   [深拷贝【指针】](#htoc-11111111)

-   [析构函数](#htoc-111111111)

-   [静态成员](#htoc-1111111111)

-   [this指针](#htoc-this)

-   [友元](#htoc-111111111111111)

-   [重载](#htoc-1111111111111111)

    -   [运算符重载](#htoc-11111111111111111)

-   [Q&A](#htoc-q-amp-a)

    -   [蓝图中的ref引用和C++中的构造函数的拷贝是一个原理吗](#htoc-ref-c)
    -   [为什么要避免拷贝?](#htoc-1111111111111111111111)

-   [const 的所有常见用法](#htoc-const)

    -   [1. 修饰变量：值不能被修改](#htoc-11111111111111111111111)
    -   [2. 修饰指针：有两种位置](#htoc-2)
    -   [3. 修饰引用参数：只读传入](#htoc-3)
    -   [4. 修饰函数末尾：函数不修改成员变量](#htoc-4)
    -   [5. 修饰返回值](#htoc-5)
    -   [在 UE5 里的常见组合](#htoc-ue5)

## 访问权限

-       public: // 公共权限 类内可以访问，类外可以访问
-       protected:// 保护权限 类内可以访问，类外不可以访问
-       private: // 私有权限 类内可以访问，类外不可以访问

```
#include <iostream>
using namespace std;
long long a, b;
// class代表设计一个类，类后面紧跟着的就是类名称
class Circle
{
    // 访问权限
    // 公共权限
public:
    // 属性
    //半径
    int m_r;
    // 行为
    //获取圆的周长
    double calculate()
    {
        return 2*3.14*m_r;
    }
};
 int main()
{
    //通过圆类创建具体的圆
    Circle cl;
    cl.m_r=10;
    cout<<"calculate="<<cl.calculate()<<endl;
    return 0;
}
 
```

```
#include <iostream>
using namespace std;
long long a, b;
// class代表设计一个类，类后面紧跟着的就是类名称
class Circle
{
    // 访问权限
    // 公共权限
public:
    // 属性
    //半径
    int m_r;
    // 行为
    //获取圆的周长
    double calculate()
    {
        return 2*3.14*m_r;
    }
};
 int main()
{
    //通过圆类创建具体的圆
    Circle cl;
    cl.m_r=10;
    cout<<"calculate="<<cl.calculate()<<endl;
    return 0;
}
 
```

**成员属性为私有，可以自己控制读写权限**

## 构造函数

>  构造函数，没有返回值，也不写void 函数名与类名相同 构造函数可以有参数，因此可以发生重载 程序在调用对象时会自动调用构造

```
#include <iostream>
using namespace std;
long long a, b;
class Person
{
private:
    int m_L, m_W,m_H;
public:
    ~Person()//函数名和类名相同 在名称前加~
    {
        cout<<"Person 构造函数的调用"<<endl;
    }//构造函数
};

//析构函数 进行清理操作
//构造和析构都是必须有的 自己不提供的话编译器会提供一个空实现的构造和析构
void test1()
{
    Person p;//
 
}
int main()
{
    test1();
    return 0;
}
```

```
#include <iostream>
using namespace std;
long long a, b;
class Person
{
private:
    int m_L, m_W,m_H;
public:
    ~Person()//函数名和类名相同 在名称前加~
    {
        cout<<"Person 构造函数的调用"<<endl;
    }//构造函数
};

//析构函数 进行清理操作
//构造和析构都是必须有的 自己不提供的话编译器会提供一个空实现的构造和析构
void test1()
{
    Person p;//
 
}
int main()
{
    test1();
    return 0;
}
```

![](/images/uploads/encapsulation/encap-01.webp)

### initialization list

![](/images/uploads/encapsulation/encap-02.webp)

![](/images/uploads/encapsulation/encap-03.webp)

```
把r赋值给re，把i赋值给im，和在打括号里面去赋值的结果是一样的，在这里是【初始化】，在括号里面是【再赋值】，结果一样过程不一样。后者在效率上差一点。
```

两种分类方式：

-   有参构造无参构造

<!---->

-   普通构造拷贝构造

**拷贝构造函数的调用时机**

![](/images/uploads/encapsulation/encap-04.webp)

## 深拷贝与浅拷贝

浅拷贝：简单的复制拷贝操作

深拷贝：在堆区重新申请空间，进行拷贝操作

![](/images/uploads/encapsulation/encap-05.webp)

## 深拷贝【指针】

![](/images/uploads/encapsulation/encap-06.webp)

```
#include <iostream>
using namespace std;
class Person
{
public:
  int m_age;
  int *m_weight;
  Person(int age,int weight)
  {
    m_age = age;
    m_weight=new int(weight);
    cout << "有参" << endl;
  }
  Person(const Person &p)
  {
    cout << "person copydo" << endl;
    m_age = p.m_age;
    //深拷贝操作
    m_weight = new int(*p.m_weight);
  }
  ~Person()
  {
    if(m_weight!=NULL){
      delete m_weight;
      m_weight=NULL;
    }
    cout << "析构do" << endl;
  }
};
// 调用
void test01()
{
  Person(14,134);
  Person p1(19,188);
  Person p2(p1);
}
int main()
{
  test01();
  return 0;
}
```

```
#include <iostream>
using namespace std;
class Person
{
public:
  int m_age;
  int *m_weight;
  Person(int age,int weight)
  {
    m_age = age;
    m_weight=new int(weight);
    cout << "有参" << endl;
  }
  Person(const Person &p)
  {
    cout << "person copydo" << endl;
    m_age = p.m_age;
    //深拷贝操作
    m_weight = new int(*p.m_weight);
  }
  ~Person()
  {
    if(m_weight!=NULL){
      delete m_weight;
      m_weight=NULL;
    }
    cout << "析构do" << endl;
  }
};
// 调用
void test01()
{
  Person(14,134);
  Person p1(19,188);
  Person p2(p1);
}
int main()
{
  test01();
  return 0;
}
```

## 析构函数

对象的初始化和清理：

初始化列表

```
#include <iostream>
using namespace std;
class Person
{
public:
  int m_A;
  int m_B;
  int m_C;
  Person(int a, int b, int c) : m_A(a), m_B(b), m_C(c) {}
};
int main()
{
  Person p1(10, 20, 30);
  cout << p1.m_A << " " << p1.m_B << ' ' << p1.m_C;
  return 0;
}
```

```
#include <iostream>
using namespace std;
class Person
{
public:
  int m_A;
  int m_B;
  int m_C;
  Person(int a, int b, int c) : m_A(a), m_B(b), m_C(c) {}
};
int main()
{
  Person p1(10, 20, 30);
  cout << p1.m_A << " " << p1.m_B << ' ' << p1.m_C;
  return 0;
}
```

类对象作为类成员

```
#include <iostream>
using namespace std;
class Phone
{
public:
    string p_kind;
    Phone(string name)
    {
        p_kind = name;
    }
    ~Phone(){
        cout<<"析构2"<<endl;
    }
};
class Person
{
public:
    string m_name;
    Phone m_phone;
    Person(string name, string kind) : m_name(name), m_phone(kind) {
        cout<<"do"<<endl;
    }
    ~Person(){
        cout<<"析构1"<<endl;
    }
};
void test01()
{
    Person p("aisssky", "huawei");
    cout<<p.m_phone.p_kind;
}
int main()
{
    test01();
    return 0;
}
```

```

#include <iostream>
using namespace std;
class Phone
{
public:
    string p_kind;
    Phone(string name)
    {
        p_kind = name;
    }
    ~Phone(){
        cout<<"析构2"<<endl;
    }
};
class Person
{
public:
    string m_name;
    Phone m_phone;
    Person(string name, string kind) : m_name(name), m_phone(kind) {
        cout<<"do"<<endl;
    }
    ~Person(){
        cout<<"析构1"<<endl;
    }
};
void test01()
{
    Person p("aisssky", "huawei");
    cout<<p.m_phone.p_kind;
}
int main()
{
    test01();
    return 0;
}
```

## 静态成员

![](/images/uploads/encapsulation/encap-07.webp)

```
#include <iostream>
using namespace std;
class Phone
{
public:
    static int m_A;
    // 所有成员都共享同一份数据
private:
    static int m_B;
};
int Phone ::m_A = 100; // 类外初始化操作
int Phone ::m_B=200;
void test01()
{
    Phone p;
    Phone p2;
    p2.m_A = 200; // 结果变为200
    cout << p.m_A << endl;
}
void test02()
{
    // 静态成员变量 不属于某个对象上 所有成员都共享一份数据
    // 因此静态成员变量有两种访问方式
    Phone p3;
    // 1.通过对象进行访问
    cout << p3.m_A << endl;
    // 2.通过类名进行访问
    cout << Phone::m_A << endl;//类外访问不到私有成员
}
int main()
{
    test01();
    test02();
    return 0;
}
```

```
#include <iostream>
using namespace std;
class Phone
{
public:
    static int m_A;
    // 所有成员都共享同一份数据
private:
    static int m_B;
};
int Phone ::m_A = 100; // 类外初始化操作
int Phone ::m_B=200;
void test01()
{
    Phone p;
    Phone p2;
    p2.m_A = 200; // 结果变为200
    cout << p.m_A << endl;
}
void test02()
{
    // 静态成员变量 不属于某个对象上 所有成员都共享一份数据
    // 因此静态成员变量有两种访问方式
    Phone p3;
    // 1.通过对象进行访问
    cout << p3.m_A << endl;
    // 2.通过类名进行访问
    cout << Phone::m_A << endl;//类外访问不到私有成员
}
int main()
{
    test01();
    test02();
    return 0;
}
```

> 静态函数只能访问静态成员

```
#include <iostream>
using namespace std;
class Phone
{
public:
    static int m_A;
    // 所有成员都共享同一份数据
    static void func(){
        m_A=522;
        cout<<"static void do"<<endl;
    }
private:
    static int m_B;
};
int Phone ::m_A = 100; // 类外初始化操作
int Phone ::m_B=200;
void test01()
{
    Phone p;
    Phone p2;
    p2.m_A = 200; // 结果变为200
    cout << p.m_A << endl;
    Phone::func();
    cout << p.m_A << endl;
}
int main()
{
    test01();
    return 0;
}
```

```
#include <iostream>
using namespace std;
class Phone
{
public:
    static int m_A;
    // 所有成员都共享同一份数据
    static void func(){
        m_A=522;
        cout<<"static void do"<<endl;
    }
private:
    static int m_B;
};
int Phone ::m_A = 100; // 类外初始化操作
int Phone ::m_B=200;
void test01()
{
    Phone p;
    Phone p2;
    p2.m_A = 200; // 结果变为200
    cout << p.m_A << endl;
    Phone::func();
    cout << p.m_A << endl;
}
int main()
{
    test01();
    return 0;
}
```

> 对象模型和成员函数分开存储

```
#include <iostream>
using namespace std;
class Phone
{
};
void test01()
{
    Phone p;
    cout<<"size of p = "<<sizeof(p)<<endl;
}
int main()
{
    test01();
    return 0;
}
//size of p=1
//空对象占用内存为1；
```

```
#include <iostream>
using namespace std;
class Phone
{
};
void test01()
{
    Phone p;
    cout<<"size of p = "<<sizeof(p)<<endl;
}
int main()
{
    test01();
    return 0;
}
//size of p=1
//空对象占用内存为1；
```

![](/images/uploads/encapsulation/encap-08.webp)

## this指针

> 本质是指针常量 指向是不可以更改的 指向的值是可以修改的

![](/images/uploads/encapsulation/encap-09.webp)

```
#include <iostream>
using namespace std;
class Phone
{
public:
    int age;
    Phone(int age){
        this->age=age;
        //this指针指的是被调用的成员函数所属的对象
    }
    Phone &Padd(Phone &p){//用引用的方式进行返回
        this->age+=p.age;
        return *this;//this指向篇p2的指针，*this指向的是p2这个对象的本体
    }//返回对象本身
};
void test01()
{
    Phone p1(15);
    cout<<p1.age<<endl;
}
void test02(){
    Phone p2(15);Phone p3(15);
    p2.Padd(p3).Padd(p3).Padd(p3);//可以实现追加，就像字符串
    cout<<p2.age<<endl;
}
int main()
{
    test01();
    test02();
    return 0;
}
```

```
#include <iostream>
using namespace std;
class Phone
{
public:
    int age;
    Phone(int age){
        this->age=age;
        //this指针指的是被调用的成员函数所属的对象
    }
    Phone &Padd(Phone &p){//用引用的方式进行返回
        this->age+=p.age;
        return *this;//this指向篇p2的指针，*this指向的是p2这个对象的本体
    }//返回对象本身
};
void test01()
{
    Phone p1(15);
    cout<<p1.age<<endl;
}
void test02(){
    Phone p2(15);Phone p3(15);
    p2.Padd(p3).Padd(p3).Padd(p3);//可以实现追加，就像字符串
    cout<<p2.age<<endl;
}
int main()
{
    test01();
    test02();
    return 0;
}
```

> 空指针访问成员函数
>
> 如果用到this，需要多考虑if(this==NULL){return;}

```
void test01()
{
    Phone *p=NULL;
    Phone p1(15);
    p->Show(p1);
    cout<<p1.m_age<<endl;
}
```

```
void test01()
{
    Phone *p=NULL;
    Phone p1(15);
    p->Show(p1);
    cout<<p1.m_age<<endl;
}
```

const修饰成员函数 加上后 函数为常函数 对象为常对象

![](/images/uploads/encapsulation/encap-10.webp)

在成员函数后面加const修饰的是this指针指向，让指针指向的值也不可以修改

```
#include <iostream>
using namespace std;
class Phone
{
public:
    int m_A;
    void show() const//==Phone *const this
    {
        this->m_B=100;
    }
    mutable int m_B;//特殊变量 加mutable可以修改
};
void test01()
{
    Phone p1;
    p1.show();
    p1.m_B=250;
    cout<<p1.m_B;//250
}
int main()
{
    test01();
    return 0;
}
```

```
#include <iostream>
using namespace std;
class Phone
{
public:
    int m_A;
    void show() const//==Phone *const this
    {
        this->m_B=100;
    }
    mutable int m_B;//特殊变量 加mutable可以修改
};
void test01()
{
    Phone p1;
    p1.show();
    p1.m_B=250;
    cout<<p1.m_B;//250
}
int main()
{
    test01();
    return 0;
}
```

## 友元

友元类

访问类中的私有成员

成员函数做友元

某类的成员函数作为本类的好朋友，可以访问

## 重载

### 运算符重载

1.1加号运算符重载  
作用：实现自定义数据类型的运算

![](/images/uploads/encapsulation/encap-11.webp)

```
#include <iostream>
using namespace std;
class Person
{
public:
    int m_A;
    int m_B;
    Person operator+(Person &p){
        Person temp;
        temp.m_A=this->m_A+p.m_A;
        temp.m_B=this->m_B+p.m_B;
        return temp;
    }
};
void test01()
{
    Person p1;
    Person p2;
    p1.m_A=10;
    p1.m_B=12;
    p2.m_A=10;
    p2.m_B=13;
    Person p3;
    p3=p1+p2;
    cout<<p3.m_A<<endl;
}
int main()
{
    test01();
    return 0;
}
```

```
#include <iostream>
using namespace std;
class Person
{
public:
    int m_A;
    int m_B;
    Person operator+(Person &p){
        Person temp;
        temp.m_A=this->m_A+p.m_A;
        temp.m_B=this->m_B+p.m_B;
        return temp;
    }
};
void test01()
{
    Person p1;
    Person p2;
    p1.m_A=10;
    p1.m_B=12;
    p2.m_A=10;
    p2.m_B=13;
    Person p3;
    p3=p1+p2;
    cout<<p3.m_A<<endl;
}
int main()
{
    test01();
    return 0;
}
```

1.2左移运算符

```
#include <iostream>
using namespace std;
class Person
{
  public:
    int m_A;
    int m_B;
    };
    ostream &operator<<(ostream &cout,Person &p){
        cout<<p.m_A<<endl;   
        cout<<p.m_B<<endl;
        return cout;
        }
    void test01(){
        Person p1;
        p1.m_A=10;
        p1.m_B=12;
        cout<<p1<<"aisss"<<endl;
        }
        
int main(){
    test01();
    return 0;
    }
```

```
#include <iostream>
using namespace std;
class Person
{
  public:
    int m_A;
    int m_B;
    };
    ostream &operator<<(ostream &cout,Person &p){
        cout<<p.m_A<<endl;   
        cout<<p.m_B<<endl;
        return cout;
        }
    void test01(){
        Person p1;
        p1.m_A=10;
        p1.m_B=12;
        cout<<p1<<"aisss"<<endl;
        }
        
int main(){
    test01();
    return 0;
    }
```

1.3递增运算符重载

```
#include <iostream>
using namespace std;
class Myint{
    friend ostream &operator<<(ostream &cout, Myint myyint);
    public:
        Myint(){
            m_num=0;
            }
        Myint &operator++(){
            m_num++;//进行++运算
            return *this;//返回自身，*this <br>    
            }   
        Myint operator++(int){//后置++运算符重载，int为占位参数，double等其他不好使
            //先记录结果       
            Myint temp=*this;     
            //递增
            m_num++;<br>        
            //返回记录结果
            return temp;   
            }
    private:
        int m_num;
};
        //重载
       ostream &operator<<(ostream &cout, Myint myyint){
           cout<<myyint.m_num;
           return cout;
           }
 void test01(){
          Myint p;
          cout<<++(++p)<<endl;
       //cout<<p<<endl;
       }
 void test02(){
     Myint mml; 
     cout<<mml++<<endl;
     cout<<mml<<endl;
     }
     int main(){
         int a=0;
         cout<<++a<<endl;
         test01();    
         test02();    
         return 0;
         }
 //运行结果：1 2 0 1
```

```
#include <iostream>
using namespace std;
class Myint{
    friend ostream &operator<<(ostream &cout, Myint myyint);
    public:
        Myint(){
            m_num=0;
            }
        Myint &operator++(){
            m_num++;//进行++运算
            return *this;//返回自身，*this <br>    
            }   
        Myint operator++(int){//后置++运算符重载，int为占位参数，double等其他不好使
            //先记录结果       
            Myint temp=*this;     
            //递增
            m_num++;<br>        
            //返回记录结果
            return temp;   
            }
    private:
        int m_num;
};
        //重载
       ostream &operator<<(ostream &cout, Myint myyint){
           cout<<myyint.m_num;
           return cout;
           }
 void test01(){
          Myint p;
          cout<<++(++p)<<endl;
       //cout<<p<<endl;
       }
 void test02(){
     Myint mml; 
     cout<<mml++<<endl;
     cout<<mml<<endl;
     }
     int main(){
         int a=0;
         cout<<++a<<endl;
         test01();    
         test02();    
         return 0;
         }
 //运行结果：1 2 0 1
```

赋值操作

![](/images/uploads/encapsulation/encap-12.webp)

```
#include <iostream>
using namespace std;
class Person
{
public:
   Person(int age){
    m_age=new int(age);
   }
    int *m_age;
    ~Person()
    {
        if(m_age!=NULL){
            delete m_age;
            m_age=NULL;
        }
    }
    Person &operator=(Person &p)
    {
        //先判断是否有属性在堆区，如果有先释放干净，
        if(m_age!=NULL){
            delete m_age;
            m_age=NULL;
        }
        //再深拷贝
        m_age=new int(*p.m_age);
        return *this;
    }
};
void test01()
{
   Person p1(18);
   Person p2(20);
   Person p3(26);
   p2=p1=p3;//实现赋值的连等，需要返回自身
   cout<<*p1.m_age<<endl;
   cout<<*p2.m_age<<endl;
}
int main()
{
    test01();
    return 0;
}
```

```
```

重载关系运算符

```
#include <iostream>
using namespace std;
class Person
{
public:
    Person(string name, int age){
        m_name=name;
        m_age=age;
    }
    string m_name;
    int m_age;
    // 重载关系运算符
    bool operator==(Person &p)
    {
        if (this->m_name == p.m_name && this->m_age == p.m_age)
        {
            return true;
        }
        return false;
    }
    bool operator!=(Person &p){
        if(this->m_name!=p.m_name||this->m_age!=p.m_age){
            return true;
        }
        return false;
    }
    bool operator>=(Person &p){
        if(this->m_age>=p.m_age){
            return true;
        }
        return false;
    }
};
void test01()
{
    Person p1("aisssky", 18);
    Person p2("aisssky", 18);
    if(p1==p2){
        cout<<"iwc"<<"磕你俩了"<<endl;
    }
    else if(p1!=p2){
        cout<<"唉"<<endl<<"没关系"<<endl;
        if(p1>=p2){
            cout<<"那p1在左边吧"<<endl;
        }
        else{
            cout<<"那p2在左边吧"<<endl;
        }
    }
}
int main()
{
    test01();
    return 0;
}
```

函数调用重载（仿函数）非常灵活，没有固定的写法，类似于平时调用的函数库写法

```
#include <iostream>
using namespace std;
class Person
{
public:
    void operator()(string name){
        cout<<name<<endl;
    }
};
int main()
{
    Person MyPrint;
    MyPrint("gogogo");
    return 0;
}
```

```
#include <iostream>
using namespace std;
class Person
{
public:
    void operator()(string name){
        cout<<name<<endl;
    }
};
int main()
{
    Person MyPrint;
    MyPrint("gogogo");
    return 0;
}
```

```
```

## Q&A

### 蓝图中的ref引用和C++中的构造函数的拷贝是一个原理吗

蓝图里的 **By Ref对应的是 C++ 里的引用传参**：

指针：传的是地址，可以为空，可以换指向;

引用：底层也是地址，但不能为空，不能换指向

```
默认传参（By Value）  →  传进去一份拷贝，改了不影响原来的
By Ref              →  传进去的是原始数据的"地址"，改了会影响原来的
```

```
// By Value（蓝图默认）
void TakeDamage(float Amount)      // Amount 是拷贝

// By Ref（蓝图的 Ref）
void TakeDamage(float& Amount)     // Amount 是原始变量的引用
```

```
// By Value（蓝图默认）
void TakeDamage(float Amount)      // Amount 是拷贝

// By Ref（蓝图的 Ref）
void TakeDamage(float& Amount)     // Amount 是原始变量的引用
```

拷贝构造函数是另一件事,解决的问题是：

> **用一个已有对象，初始化一个新对象时，数据怎么复制**

````
FMyStruct A;
FMyStruct B = A;  // 触发拷贝构造函数，B 是全新的一份
```

和 Ref 完全相反——Ref 是**不创建新对象**，拷贝构造是**专门创建新对象**。

---

## 一张图区分三者
```
By Value      →  自动创建一份拷贝，两者独立
By Ref        →  指向同一块数据，改一个影响另一个
拷贝构造函数  →  用来定义"怎么拷贝"的规则，是 By Value 背后的机制
````

````
FMyStruct A;
FMyStruct B = A;  // 触发拷贝构造函数，B 是全新的一份
```

和 Ref 完全相反——Ref 是**不创建新对象**，拷贝构造是**专门创建新对象**。

---

## 一张图区分三者
```
By Value      →  自动创建一份拷贝，两者独立
By Ref        →  指向同一块数据，改一个影响另一个
拷贝构造函数  →  用来定义"怎么拷贝"的规则，是 By Value 背后的机制
````

> 蓝图的 Ref 对应 C++ 的**引用传参**，而拷贝构造函数是 By Value 传参背后的底层机制——方向完全相反，一个避免拷贝，一个定义如何拷贝。

### 为什么要**避免**拷贝?

**拷贝是有代价的**,避免拷贝的本质是**避免不必要的内存操作**——数据越大、调用越频繁，拷贝的代价越高，这时候传引用只传一个地址，性能差距可以非常显著。

简单类型无所谓：

```
float A = 1.0f;
float B = A;  // 拷贝 4 个字节，代价几乎为零
```

```
float A = 1.0f;
float B = A;  // 拷贝 4 个字节，代价几乎为零
```

但遇到复杂对象就不一样了：

```
TArray<FHitResult> HitResults;  // 里面可能有几百个元素

void ProcessHits(TArray<FHitResult> Hits)  // ← By Value
// 调用这个函数时，几百个元素全部复制一遍
// 每帧调用 → 每帧都在大量复制内存
```

```
TArray<FHitResult> HitResults;  // 里面可能有几百个元素

void ProcessHits(TArray<FHitResult> Hits)  // ← By Value
// 调用这个函数时，几百个元素全部复制一遍
// 每帧调用 → 每帧都在大量复制内存
```

用 Ref 之后

````
void ProcessHits(const TArray<FHitResult>& Hits)  // ← By Ref
// 只传一个地址进去，8 个字节
// 数据一份都没复制
```

---

## 什么时候在意，什么时候不在意
```
int、float、bool      →  随便，拷贝代价几乎为零
FVector、FRotator     →  小结构体，问题不大
TArray、TMap          →  一定要注意，能传引用就传引用
自定义复杂 Struct     →  看里面有多少数据
UObject 指针          →  本身就是指针，传的就是地址，不存在这个问题
````

````
void ProcessHits(const TArray<FHitResult>& Hits)  // ← By Ref
// 只传一个地址进去，8 个字节
// 数据一份都没复制
```

---

## 什么时候在意，什么时候不在意
```
int、float、bool      →  随便，拷贝代价几乎为零
FVector、FRotator     →  小结构体，问题不大
TArray、TMap          →  一定要注意，能传引用就传引用
自定义复杂 Struct     →  看里面有多少数据
UObject 指针          →  本身就是指针，传的就是地址，不存在这个问题
````

![](/images/uploads/encapsulation/encap-13.webp)

**第一个 `const`** TArray<FGameplayTagStack>&

调用方拿到这个引用之后**不能修改**里面的内容，只能读。

**`&` 返回引用**

```
TArray<FGameplayTagStack>&返回的是 Stacks 本身的引用，而不是拷贝一份新的返回出去：
```

不修改类的成员变量（末尾 const）

## `const` 的所有常见用法

* * *

### 1. 修饰变量：值不能被修改

```
const float MaxHealth = 100.f;
MaxHealth = 200.f;  // ❌ 编译报错
```

```
const float MaxHealth = 100.f;
MaxHealth = 200.f;  // ❌ 编译报错
```

* * *

### 2. 修饰指针：有两种位置

````
// const 在左边：指向的内容不能改，指针本身可以换指向
const float* Ptr = &Health;
*Ptr = 200.f;   // ❌ 不能修改内容
Ptr = &Armor;   // ✅ 可以换指向

// const 在右边：指针本身不能换指向，内容可以改
float* const Ptr = &Health;
*Ptr = 200.f;   // ✅ 可以修改内容
Ptr = &Armor;   // ❌ 不能换指向

// 两边都有：什么都不能改
const float* const Ptr = &Health;
```

记忆方法：
```
const 在 * 左边  →  内容锁死
const 在 * 右边  →  指向锁死
````

````
// const 在左边：指向的内容不能改，指针本身可以换指向
const float* Ptr = &Health;
*Ptr = 200.f;   // ❌ 不能修改内容
Ptr = &Armor;   // ✅ 可以换指向

// const 在右边：指针本身不能换指向，内容可以改
float* const Ptr = &Health;
*Ptr = 200.f;   // ✅ 可以修改内容
Ptr = &Armor;   // ❌ 不能换指向

// 两边都有：什么都不能改
const float* const Ptr = &Health;
```

记忆方法：
```
const 在 * 左边  →  内容锁死
const 在 * 右边  →  指向锁死
````

* * *

### 3. 修饰引用参数：只读传入

```
// 最常见的用法，避免拷贝同时防止修改
void Func(const TArray<FHitResult>& Hits)
{
    Hits.Add(...);  // ❌ 编译报错，不能修改
}
```

```
// 最常见的用法，避免拷贝同时防止修改
void Func(const TArray<FHitResult>& Hits)
{
    Hits.Add(...);  // ❌ 编译报错，不能修改
}
```

* * *

### 4. 修饰函数末尾：函数不修改成员变量

```
class AMyActor
{
    float Health = 100.f;

    // const 函数：承诺不修改任何成员变量
    float GetHealth() const
    {
        Health = 0.f;  // ❌ 编译报错
        return Health; // ✅ 只读没问题
    }
};
```

```
class AMyActor
{
    float Health = 100.f;

    // const 函数：承诺不修改任何成员变量
    float GetHealth() const
    {
        Health = 0.f;  // ❌ 编译报错
        return Health; // ✅ 只读没问题
    }
};
```

* * *

### 5. 修饰返回值

```
// 返回 const 引用：调用方拿到后不能修改
const TArray<FGameplayTagStack>& GetStacks() const
{
    return Stacks;
}

// 调用方
auto& Stacks = GetStacks();
Stacks.Add(...);  // ❌ 编译报错
```

```
// 返回 const 引用：调用方拿到后不能修改
const TArray<FGameplayTagStack>& GetStacks() const
{
    return Stacks;
}

// 调用方
auto& Stacks = GetStacks();
Stacks.Add(...);  // ❌ 编译报错
```

* * *

### 在 UE5 里的常见组合

```
// 标准 Getter：最常见
float GetHealth() const { return Health; }

// 大型数据只读传参
void Process(const TArray<FHitResult>& Hits) const

// 常量定义
static const float MAX_HEALTH = 100.f;
```

```
// 标准 Getter：最常见
float GetHealth() const { return Health; }
// 大型数据只读传参
void Process(const TArray<FHitResult>& Hits) const
// 常量定义
static const float MAX_HEALTH = 100.f;
```
